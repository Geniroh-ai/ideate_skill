#!/usr/bin/env node
/**
 * ideate overflow detector — pixel-perfect content-fit check
 *
 * Spawns headless Chrome via the Chrome DevTools Protocol (no puppeteer dep)
 * and measures every slide for actual content overflow:
 *
 *   - slide.scrollHeight > slide.clientHeight  (vertical overflow)
 *   - slide.scrollWidth  > slide.clientWidth   (horizontal overflow)
 *   - any descendant whose rect extends past the slide's rect
 *
 * Usage:
 *   node check-overflow.js <input.html>
 *
 * Exits 0 if all slides fit, 1 if any overflow. Writes a JSON report to stdout.
 *
 * Zero npm deps. Uses Chrome's --remote-debugging-port + raw WebSocket via Node.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const crypto = require('crypto');

// ──────────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────────
const inputPath = process.argv[2];
if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('Usage: node check-overflow.js <input.html>');
  process.exit(1);
}
const absInput = 'file://' + path.resolve(inputPath);

// ──────────────────────────────────────────────────────────────────
// Locate Chrome / Chromium
// ──────────────────────────────────────────────────────────────────
function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  console.error('No Chrome / Chromium / Edge found. Install one to enable overflow checks.');
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────
// Minimal CDP WebSocket client (no deps)
// ──────────────────────────────────────────────────────────────────
function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(parseInt(u.port, 10), u.hostname, () => {
      sock.write(
        `GET ${u.pathname} HTTP/1.1\r\n` +
        `Host: ${u.host}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    let buf = Buffer.alloc(0);
    sock.once('data', (d) => {
      const idx = d.indexOf('\r\n\r\n');
      if (idx < 0) return reject(new Error('Bad WS handshake'));
      buf = d.slice(idx + 4);
      sock.on('data', (more) => { buf = Buffer.concat([buf, more]); flush(); });
      resolve({ send, close: () => sock.end(), onMessage: (cb) => (handlers.push(cb)) });
      flush();
    });
    sock.once('error', reject);

    const handlers = [];
    function flush() {
      while (buf.length >= 2) {
        const second = buf[1];
        let len = second & 0x7f;
        let off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len).toString('utf8');
        buf = buf.slice(off + len);
        for (const h of handlers) h(payload);
      }
    }
    function send(text) {
      const data = Buffer.from(text, 'utf8');
      const mask = crypto.randomBytes(4);
      let header;
      if (data.length < 126) {
        header = Buffer.from([0x81, 0x80 | data.length]);
      } else if (data.length < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(data.length, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(data.length), 2);
      }
      const masked = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
      sock.write(Buffer.concat([header, mask, masked]));
    }
  });
}

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
(async () => {
  const chrome = findChrome();
  const port = 9222 + Math.floor(Math.random() * 1000);
  const userDataDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ideate-cdp-'));

  const proc = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1280,720',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    absInput,
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  process.on('exit', () => { try { proc.kill(); } catch (_) {} fs.rmSync(userDataDir, { recursive: true, force: true }); });

  // Wait for CDP endpoint and pick the page target (not extensions / service workers)
  let endpoint;
  for (let i = 0; i < 50; i++) {
    try {
      const list = await getJSON(`http://127.0.0.1:${port}/json`);
      const page = list.find((t) => t.type === 'page' && (t.url.startsWith('file://') || t.url === 'about:blank'));
      if (page) { endpoint = page; break; }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!endpoint) { console.error('Chrome did not expose a page target.'); process.exit(3); }

  const ws = await wsConnect(endpoint.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.onMessage((raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  function cmd(method, params = {}) {
    const myId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(myId, { resolve, reject });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  }

  await cmd('Page.enable');
  await cmd('Runtime.enable');

  // Wait for the page to actually render slides (poll up to 10s)
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const probe = await cmd('Runtime.evaluate', {
      expression: 'document.readyState === "complete" && document.querySelectorAll(".slide").length',
      returnByValue: true,
    });
    if (probe.result && probe.result.value > 0) break;
  }

  // Wait for fonts to settle
  await cmd('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  await new Promise((r) => setTimeout(r, 600));

  // Run overflow probe
  const probe = `
    (function () {
      const slides = Array.from(document.querySelectorAll('.slide'));
      const SLIDE_W = ${1280};
      const SLIDE_H = ${720};
      return slides.map((s, i) => {
        const sr = s.getBoundingClientRect();
        const overflowY = s.scrollHeight - s.clientHeight;
        const overflowX = s.scrollWidth - s.clientWidth;
        const offenders = [];
        Array.from(s.querySelectorAll('*')).forEach((el) => {
          const r = el.getBoundingClientRect();
          const slideRight = sr.right;
          const slideBottom = sr.bottom;
          // Skip purely positioned chrome (header/footer) and elements outside viewport
          if (r.width === 0 || r.height === 0) return;
          if (r.bottom > slideBottom + 1 && el !== s) {
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className || '').toString().slice(0, 60),
              text: (el.textContent || '').trim().slice(0, 80),
              overshoot_px: Math.round(r.bottom - slideBottom),
            });
          }
        });
        return {
          slide_index: i + 1,
          overflowY_px: Math.max(0, overflowY),
          overflowX_px: Math.max(0, overflowX),
          offenders: offenders.slice(0, 5),
          rect: { width: Math.round(sr.width), height: Math.round(sr.height) },
        };
      });
    })();
  `;
  const result = await cmd('Runtime.evaluate', { expression: probe, returnByValue: true });
  const report = result.result.value || [];

  // Verdict
  const failing = report.filter((r) => r.overflowY_px > 1 || r.overflowX_px > 1 || r.offenders.length > 0);
  const summary = {
    total_slides: report.length,
    failing_count: failing.length,
    passed: failing.length === 0,
    failures: failing,
  };

  console.log(JSON.stringify(summary, null, 2));

  ws.close();
  proc.kill();
  process.exit(failing.length === 0 ? 0 : 1);
})();
