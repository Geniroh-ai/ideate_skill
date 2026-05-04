#!/usr/bin/env node
/**
 * ideate compile — markdown source-of-truth → final HTML
 *
 * Usage:
 *   node compile.js <markdown.md> <design-name> <out.html>
 *
 * Example:
 *   node compile.js ./markdown/current.md mckinsey-classic ./html/v1.html
 *
 * The markdown follows the structured format documented in slide-types.md.
 * Each slide is a `# Slide NN — <name>` block with `> key: value` metadata
 * lines describing layout, content, and component fields.
 *
 * Zero npm dependencies — uses Node stdlib only.
 */

const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────────────────────────
// Args + paths
// ──────────────────────────────────────────────────────────────────
const [, , mdPath, designName, outPath] = process.argv;
if (!mdPath || !designName || !outPath) {
  console.error('Usage: node compile.js <markdown.md> <design-name> <out.html>');
  process.exit(1);
}

const skillDir = path.resolve(__dirname, '..');
const designDir = path.join(skillDir, 'designs', designName);
const designJsonPath = path.join(designDir, 'design.json');
const templatePath = path.join(skillDir, 'designs', '_master_template.html');

if (!fs.existsSync(designJsonPath)) {
  console.error(`Design not found: ${designName}\nLooked at: ${designJsonPath}`);
  process.exit(2);
}

const design = JSON.parse(fs.readFileSync(designJsonPath, 'utf8'));
const template = fs.readFileSync(templatePath, 'utf8');
const mdRaw = fs.readFileSync(mdPath, 'utf8');

// ──────────────────────────────────────────────────────────────────
// Markdown parser
// ──────────────────────────────────────────────────────────────────
function parseMarkdown(md) {
  const result = { frontmatter: {}, slides: [], speakerNotes: '' };

  // YAML-ish frontmatter
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    fmMatch[1].split('\n').forEach((line) => {
      const m = line.match(/^([^:]+):\s*(.*)$/);
      if (m) result.frontmatter[m[1].trim()] = m[2].trim();
    });
    md = md.slice(fmMatch[0].length);
  }

  // Split off speaker notes
  const notesIdx = md.indexOf('# Speaker Notes');
  if (notesIdx >= 0) {
    result.speakerNotes = md.slice(notesIdx);
    md = md.slice(0, notesIdx);
  }

  // Slides delimited by `# Slide`
  const slideBlocks = md.split(/^# Slide /m).slice(1);
  for (const block of slideBlocks) {
    const slide = parseSlide('# Slide ' + block);
    if (slide) result.slides.push(slide);
  }
  return result;
}

function parseSlide(block) {
  const headerMatch = block.match(/^# Slide (\d+)\s*—\s*(.+?)\n/);
  if (!headerMatch) return null;
  const slide = { num: parseInt(headerMatch[1], 10), name: headerMatch[2].trim(), props: {}, items: [], columns: [], rows: [] };

  const lines = block.split('\n').slice(1);
  let inListKey = null;
  let currentItem = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('>')) continue;
    const stripped = line.replace(/^>\s?/, '');

    // Top-level scalar: `key: value`
    const scalar = stripped.match(/^([a-z_][a-z0-9_]*):\s*(.+)$/i);
    if (scalar && !line.startsWith('>   ')) {
      slide.props[scalar[1]] = scalar[2].replace(/^"|"$/g, '');
      inListKey = null;
      continue;
    }

    // List header: `key:` (no value, items follow)
    const listHead = stripped.match(/^([a-z_][a-z0-9_]*):\s*$/i);
    if (listHead && !line.startsWith('>   ')) {
      inListKey = listHead[1];
      slide[inListKey] = slide[inListKey] || [];
      continue;
    }

    // List item: `- field: value` (starts new item)
    const itemStart = stripped.match(/^\s*-\s+([a-z_][a-z0-9_]*):\s*(.*)$/i);
    if (itemStart && inListKey) {
      currentItem = { [itemStart[1]]: itemStart[2] };
      slide[inListKey].push(currentItem);
      continue;
    }

    // List item continuation: `  field: value`
    const cont = stripped.match(/^\s+([a-z_][a-z0-9_]*):\s*(.*)$/i);
    if (cont && currentItem) {
      currentItem[cont[1]] = cont[2];
      continue;
    }

    // Bullet item under list (e.g. body bullets): `  - text`
    const bullet = stripped.match(/^\s+-\s+(.+)$/);
    if (bullet && inListKey && currentItem) {
      currentItem.bullets = currentItem.bullets || [];
      currentItem.bullets.push(bullet[1]);
      continue;
    }
  }
  return slide;
}

// ──────────────────────────────────────────────────────────────────
// HTML escapers + helpers
// ──────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Allow simple inline `<em>` for accent and `<b>` for emphasis from raw markdown
const richEsc = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');

const headerHTML = (n, total, label) => `
  <div class="s-header">
    <div class="label">${esc(label || '')}</div>
    <div class="meta">${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>
  </div>
`;

const footerHTML = (n, brand) => `
  <div class="s-footer">
    <div class="brand">${brand || 'ideate'}</div>
    <div class="pgnum">${String(n).padStart(2, '0')}</div>
  </div>
`;

// ──────────────────────────────────────────────────────────────────
// Layout renderers
// ──────────────────────────────────────────────────────────────────
const layouts = {
  title(s, ctx) {
    const meta = s.meta || [];
    return `<section class="slide title-slide">
      <div class="top-rail"><div class="left">${esc(s.props.confidentiality || 'Confidential — for discussion')}</div><div class="right">${esc(s.props.date || '')}</div></div>
      <div class="body">
        ${s.props.multiply ? `<div class="multiply">${richEsc(s.props.multiply)}</div>` : ''}
        <h1>${richEsc(s.props.action_title || s.props.title || '')}</h1>
        ${s.props.lead ? `<p class="lead">${richEsc(s.props.lead)}</p>` : ''}
      </div>
      <div class="meta-bar">
        ${meta.map((m) => `<div class="col"><span class="label">${esc(m.label)}</span><span class="val">${richEsc(m.val)}</span></div>`).join('')}
      </div>
    </section>`;
  },

  closing(s, ctx) {
    return `<section class="slide closing">
      ${headerHTML(s.num, ctx.total, 'Closing')}
      <div class="center-col">
        <div class="quote">${richEsc(s.props.quote || s.props.action_title || '')}</div>
        <div class="quote-rule"></div>
        <div class="signoff">${esc(s.props.signoff || 'Thank you')}</div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  'section-divider'(s, ctx) {
    return `<section class="slide section-divider">
      ${headerHTML(s.num, ctx.total, s.props.section_label || 'Section')}
      <div class="section-content">
        <div class="section-rail">${esc(s.props.rail || '')}</div>
        <div class="section-num">${esc(s.props.section_num || String(s.num))}</div>
        <div class="section-name">${richEsc(s.props.action_title || s.name)}</div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  'cols-3'(s, ctx) {
    const cols = (s.columns || []).slice(0, 3);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        ${s.props.subtitle ? `<p class="subtitle">${richEsc(s.props.subtitle)}</p>` : ''}
        <div class="cols-3">
          ${cols.map((c, i) => `<div class="col-card">
            <div class="col-num">${String(i + 1).padStart(2, '0')}</div>
            <div class="col-title">${richEsc(c.title || '')}</div>
            <div class="col-rule"></div>
            ${c.body ? `<div class="col-body">${richEsc(c.body)}</div>` : ''}
            ${c.bullets ? `<ul>${c.bullets.map((b) => `<li>${richEsc(b)}</li>`).join('')}</ul>` : ''}
          </div>`).join('')}
        </div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  'cols-2'(s, ctx) {
    const cols = (s.columns || []).slice(0, 2);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        <div class="cols-2">
          ${cols.map((c) => `<div class="col-card">
            ${c.kicker ? `<span class="kicker">${esc(c.kicker)}</span><div class="divider-strong"></div>` : ''}
            ${c.title ? `<div class="col-title">${richEsc(c.title)}</div>` : ''}
            ${c.body ? `<div class="col-body">${richEsc(c.body)}</div>` : ''}
            ${c.bullets ? `<ul>${c.bullets.map((b) => `<li>${richEsc(b)}</li>`).join('')}</ul>` : ''}
          </div>`).join('')}
        </div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  'cols-4'(s, ctx) {
    const cols = (s.columns || []).slice(0, 4);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        <div class="cols-4">
          ${cols.map((c, i) => `<div class="col-card">
            <div class="col-num">${String(i + 1).padStart(2, '0')}</div>
            <div class="col-title">${richEsc(c.title || '')}</div>
            <div class="col-rule"></div>
            ${c.body ? `<div class="col-body">${richEsc(c.body)}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  'stat-row'(s, ctx) {
    const stats = (s.stats || []).slice(0, 4);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        <div class="stat-row">
          ${stats.map((st) => `<div class="stat"><div class="v">${richEsc(st.value)}</div><div class="l">${richEsc(st.label)}</div></div>`).join('')}
        </div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  matrix(s, ctx) {
    const headers = (s.headers || []);
    const rows = (s.rows || []).slice(0, 6);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        <table class="matrix">
          <thead><tr>${headers.map((h) => `<th>${esc(h.label || h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map((r) => `<tr>${(r.cells || []).map((c) => `<td>${richEsc(c)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  flow(s, ctx) {
    const steps = (s.steps || []).slice(0, 5);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        <div class="flow">
          ${steps.map((st, i) => `<div class="step ${st.active === 'true' ? 'active' : ''}">
            <div class="step-num">— STAGE ${String(i).padStart(2, '0')}</div>
            <div class="step-title">${richEsc(st.title || '')}</div>
            <div class="step-body">${richEsc(st.body || '')}</div>
          </div>`).join('')}
        </div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  quad(s, ctx) {
    const cells = (s.cells || []).slice(0, 4);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        ${s.props.subtitle ? `<p class="subtitle">${richEsc(s.props.subtitle)}</p>` : ''}
        <div class="cgrid">
          ${cells.map((c, i) => `<div class="cbox">
            <div class="ctag">${String(i + 1).padStart(2, '0')}</div>
            <div class="ch">${richEsc(c.title || '')}</div>
            <div class="csub">${richEsc(c.body || '')}</div>
          </div>`).join('')}
        </div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },

  iconlist(s, ctx) {
    const items = (s.items || []).slice(0, 5);
    return `<section class="slide">
      ${headerHTML(s.num, ctx.total, s.props.section_label || '')}
      <div class="content">
        ${s.props.eyebrow ? `<div class="eyebrow">${esc(s.props.eyebrow)}</div>` : ''}
        <h1 class="action">${richEsc(s.props.action_title || '')}</h1>
        <div class="iconlist">
          ${items.map((it, i) => `<div class="item">
            <div class="ico">${String(i + 1).padStart(2, '0')}</div>
            <div class="txt"><div class="t">${richEsc(it.title || '')}</div><div class="d">${richEsc(it.body || '')}</div></div>
          </div>`).join('')}
        </div>
      </div>
      ${footerHTML(s.num, ctx.brand)}
    </section>`;
  },
};

// alias: cgrid → quad
layouts['cgrid'] = layouts.quad;
layouts['matrix-3col'] = layouts.matrix;
layouts['matrix-4col'] = layouts.matrix;
layouts['agenda'] = layouts['cols-3'];

// ──────────────────────────────────────────────────────────────────
// Render
// ──────────────────────────────────────────────────────────────────
function render(parsed) {
  const total = parsed.slides.length;
  const brand = parsed.frontmatter.brand || `<span style="color:var(--accent)">ideate</span> deck`;
  const ctx = { total, brand };

  const slidesHTML = parsed.slides.map((s) => {
    const layout = (s.props.layout || 'cols-2').toLowerCase();
    const renderer = layouts[layout] || layouts['cols-2'];
    return renderer(s, ctx);
  }).join('\n');

  const fonts = design.fonts;
  const tokens = design.tokens;
  const slide = design.slide;

  let out = template;
  const subs = {
    deck_title: parsed.frontmatter.deck || 'Deck',
    google_fonts_url: fonts.google_url,
    display_font: fonts.display,
    body_font: fonts.body,
    headline_font: fonts.headline_font,
    headline_weight: fonts.headline_weight,
    slide_w: slide.width,
    slide_h: slide.height,
    pad_x: slide.pad_x,
    pad_y: slide.pad_y,
    ...tokens,
    slides: slidesHTML,
  };
  for (const [k, v] of Object.entries(subs)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return out;
}

const parsed = parseMarkdown(mdRaw);
const html = render(parsed);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Compiled ${parsed.slides.length} slides → ${outPath}`);
console.log(`Design: ${design.name}  |  fonts: ${design.fonts.headline_font} + ${design.fonts.body}`);
