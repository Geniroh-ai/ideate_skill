---
name: ideate
description: Use when the user wants to create a pitch deck, slide deck, board deck, or presentation from raw context (emails, briefs, notes, source material). Guides them through a structured wizard - context gathering, design selection from pre-built McKinsey-style variations, intent capture, a two-agent content pipeline (researcher gathers exhaustive evidence + internet data, strategist converts thesis into slide-by-slide markdown), HTML rendering, pixel-perfect content-alignment validation, and PDF export. Supports power-user shortcuts: `quick`, `from-md`, `regenerate`, `export`, `switch-design`, `check-fit`. Triggers on phrases like "make a pitch deck", "create a slide deck", "ideate a deck", "/ideate", or any request to turn source material into presentation slides.
---

# ideate — McKinsey-style deck wizard

## Power-user shortcuts (parse the user's invocation BEFORE starting the wizard)

If the user's message matches one of these patterns, jump directly to the matching flow instead of running the full 13-step wizard.

| Pattern | Flow |
|---|---|
| `/ideate quick "<topic>" "<audience>"` or `quick deck about <topic> for <audience>` | **Quick mode** — minimal Q&A, sensible defaults (mckinsey-classic, explore tone, 12 slides). Skip Steps 4–8 by inferring; ask only for confirmation. |
| `/ideate from-md <path>` or `build a deck from <path.md>` | **From-markdown mode** — skip wizard entirely, run `compile.js` directly with the design declared in the markdown's frontmatter. Then validate fit and export. |
| `/ideate regenerate` (inside a project) | **Regenerate** — read `markdown/current.md`, compile to a new versioned HTML. No content changes. |
| `/ideate export` (inside a project) | **Export only** — find the latest HTML in `html/`, run `export-pdf.sh`, write to `pdf/`. |
| `/ideate switch-design <name>` (inside a project) | **Switch design** — update `.ideate/design-choice.md`, recompile HTML with the new design, validate fit. No content changes. |
| `/ideate check-fit [<html>]` | **Fit check only** — run `check-overflow.js` against the given HTML or the latest in `html/`. |
| `/ideate list-designs` | **List designs** — print the design INDEX.md table. |
| `/ideate help` | Print this shortcut table to the user. |

Default if no shortcut matches: run the full 13-step wizard from Step 0.

You are guiding the user through building a presentation deck from raw context. This skill operates as a **conversational wizard**: ask one question at a time, wait for the user's answer, then move on. Do not batch questions. Do not skip steps. The user's answers are the source of truth — never invent content they did not provide.

## Operating principles

- **One question per turn.** Each step in the wizard is a single, focused question. Wait for the user's reply before moving on.
- **The user's context is sacred.** Read everything in the project's `context/` folder before generating anything. Do not invent facts, statistics, names, or events not grounded in that context.
- **Markdown is the source of truth.** The HTML is always generated *from* the markdown — never the other way round. If the user wants to edit content, they edit the markdown, then regenerate.
- **Two-stage iteration.** Content lives in markdown. Visual lives in the chosen design template. The user can iterate on either independently.
- **Content fit is non-negotiable.** Every generated HTML must pass the alignment check before being declared done.

## Step 0 — Resolve project location

When invoked, first determine *where* this deck project lives:

1. If the user is already inside a folder that looks like an `ideate` project (has `.ideate/` marker file or matches the structure below), continue with that project. Tell the user you've detected an existing project and ask if they want to continue it or start fresh.
2. Otherwise ask: **"What should we call this deck? (used as the folder name — e.g., `british-council`, `q3-board-update`)"**
3. Create the project at `./<deck-name>/` in the current working directory.

## Step 1 — Scaffold the project repo

Once you have the deck name, create this structure inside `./<deck-name>/`:

```
<deck-name>/
├── .ideate/                      # marker + state
│   ├── project.json              # name, created_at, design_choice, tone, version_count
│   └── design-choice.md          # which design variation is in use, with overrides
├── context/                      # USER drops raw material here
│   └── README.md                 # instructions for the user
├── assets/                       # images, screenshots, extracted PPTX content, logos
│   └── README.md
├── markdown/
│   ├── current.md                # latest source-of-truth markdown
│   ├── previous/                 # timestamped previous versions
│   │   └── (empty initially)
│   └── DELTA.md                  # human-readable changelog of what changed across versions
├── html/                         # final rendered HTML versions, timestamped
│   └── (empty initially)
└── pdf/                          # exported PDFs, timestamped
    └── (empty initially)
```

Write minimal README.md stubs in `context/` and `assets/` explaining what goes there. Write the marker file `.ideate/project.json` with `{"name": "...", "created_at": "<ISO>", "version_count": 0}`.

After scaffolding, briefly tell the user the structure is ready and proceed to Step 2.

## Step 2 — Context gathering

Ask: **"Drop any source material into `./<deck-name>/context/` — emails, briefs, PDFs, meeting notes, raw thoughts, anything relevant. Reply 'done' when ready, or 'paste' if you want to paste content directly into chat."**

If the user replies `done`, run `ls` on the context folder. If empty, ask again. If non-empty, read every file (including PDFs — use the Read tool which handles PDFs natively). Summarise back to the user in 3–5 bullets what you've absorbed, and ask: **"Does this capture the source material correctly? (yes / add more)"**

If the user replies `paste`, accept their pasted content and write it to `context/pasted-<timestamp>.md`, then summarise.

## Step 3 — Audience

Ask: **"Who is this deck for?"** Examples to nudge the user: a single executive (name + role), a leadership team, a client board, internal team, an investor, a regulator. Capture verbatim.

## Step 4 — Strategic intent

Ask: **"What is the deck supposed to *do*? Pick one or describe in your own words: inform / persuade / propose / sell / align / explore / report."**

The intent maps to tone calibration in Step 7 — keep this answer for later.

## Step 5 — Key takeaways

Ask: **"What are the 3–5 things you absolutely need them to remember after this deck? List them in priority order."**

This is the argument spine. Every slide must earn its place by supporting one of these takeaways. If the user gives more than 5, push back gently — "That's 7 — which 3 are non-negotiable?"

## Step 6 — Design selection

Read `~/.claude/skills/ideate/designs/INDEX.md` (or the plugin equivalent). Present the design variations to the user as a numbered list with one-line descriptions.

Ask: **"Pick a design variation (1–N), or type 'browse' to see a longer description of each."**

If the user picks one, confirm: **"Locked in. Any tweaks to colour, font, or accent — or stick with the defaults?"** If the user wants tweaks, capture them as overrides and write to `.ideate/design-choice.md`.

## Step 7 — Tone calibration

Based on Step 4's intent, propose a tone preset:
- **Explore** — for early conversations, exploratory partnerships, "open to shaping". Headlines use "could", "might", "exploring". No hard asks.
- **Commit** — confident proposal, clear asks, definite language. Headlines use "will", "delivers", "drives".
- **Formal** — board / regulator. Restrained, evidence-led, third-person. No exclamation, no italicised flourishes.

Ask: **"Tone — `explore`, `commit`, or `formal`? (I'd suggest `<X>` based on your intent.)"**

## Step 8 — Length and structure

Ask: **"Target slide count? (default 12–18. Section dividers count.)"**

Then propose an outline based on everything captured so far. Action-titled slides only. Show the proposed outline as a numbered list with a one-line headline per slide. Ask: **"Does this outline work? (yes / revise)"**

Iterate until the user says yes.

## Step 9 — Two-agent content pipeline (Researcher → Strategist → markdown)

Content quality is the deck's biggest variable. Run a two-agent pipeline before writing the slide markdown.

### Step 9a — Researcher agent

Spawn a Research agent (using the Agent tool with `subagent_type: general-purpose`, or claude-code-guide / Explore if specifically appropriate) with a comprehensive brief:

> **Researcher mission:** Produce an exhaustive, evidence-led thesis document covering everything relevant to this deck. Three sources of input:
> 1. **Local context** — every file in `./<deck-name>/context/`. Read all of them, including PDFs, images, and any pasted notes. Extract every fact, figure, name, date, claim, and stated intent.
> 2. **The user's brief** — audience (Step 3), intent (Step 4), key takeaways (Step 5), tone (Step 7).
> 3. **Internet research** — use WebSearch for the latest authoritative data on every claim, statistic, market trend, regulation, and competitor reference touched by the context. Prefer primary sources (government, official institutions, peer-reviewed) over secondary commentary. Note publication dates.
>
> **Deliverables:** Write a structured markdown thesis to `./<deck-name>/markdown/01-research-thesis.md`:
> - **Section 1 — Source material summary**: what was in the context folder, faithfully recapped
> - **Section 2 — Verified facts and statistics**: every number, with sources and dates
> - **Section 3 — Recent developments**: anything in the last 12–24 months that the context didn't capture
> - **Section 4 — Stakeholders and entities**: who's involved, with current roles/positions
> - **Section 5 — Open questions and gaps**: what couldn't be verified, what assumptions would need user confirmation
> - **Section 6 — Strategic landscape**: competitors, alternatives, market context, regulatory backdrop
>
> Be exhaustive. Length is fine. The next agent needs raw material, not summary.

Spawn this agent in the foreground — wait for its output before proceeding.

When the agent returns, read `01-research-thesis.md` and surface to the user:
- A 5-bullet summary of what the researcher found
- Any "open questions" the researcher flagged
- Ask: **"Anything to correct or add before we hand this to the strategist?"**

### Step 9b — Strategist agent

Spawn a Strategy agent (using the Agent tool with `subagent_type: general-purpose`) with this brief:

> **Strategist mission:** You are a world-class management consultant and marketing strategist — McKinsey / BCG / Bain caliber, with deep B2B narrative craft. You've been given an exhaustive research thesis. Your job is to convert it into a slide-by-slide deck markdown that is decisive, audience-aware, and built around action-titles.
>
> **Inputs you must read:**
> - `./<deck-name>/markdown/01-research-thesis.md` (the researcher's output)
> - The user's brief: audience = `<from Step 3>`, intent = `<from Step 4>`, key takeaways = `<from Step 5>`, tone = `<from Step 7>`, design = `<from Step 6>`, target slide count = `<from Step 8>`
> - `~/.claude/skills/ideate/slide-types.md` — the layout catalogue and component constraints (max bullets per column, max table rows, etc.) you must respect
> - `~/.claude/skills/ideate/tone-presets.md` — the tone preset's language patterns
>
> **What to deliver:** Write `./<deck-name>/markdown/current.md` in the structured slide format used by `compile.js`. Every slide must:
> - Have an **action title** (a conclusion, not a topic)
> - Pick the right layout from the catalogue for the content shape
> - Respect the layout's component constraints — never exceed bullet/row limits
> - Source every numerical claim from the research thesis (don't invent)
> - Match the tone preset's language patterns
> - Include a Speaker Notes section at the end with one block per slide
>
> **Argument architecture:** Use the user's key takeaways as the spine. Every slide should earn its place by supporting one takeaway. Use section dividers (3 max) to chapter the deck. Open with a tension/opportunity slide, build the argument, close with a pointed call-to-action or positioning statement.
>
> **What NOT to do:** Don't put speaker asides on the slide (callout boxes that feel like notes — those go in Speaker Notes). Don't reference any prior conversation, email, or meeting unless the user explicitly authorised it. Don't pad — if you can say it in 12 slides, don't write 18.

Spawn this agent in the foreground — wait for its output.

When the agent returns:
- Read `current.md` and verify the slide count, layouts used, and tone match the user's brief
- Show the user the resulting outline (action titles only) and ask: **"Outline looks right? (yes / revise)"**
- Iterate until yes

If `markdown/current.md` already exists from a previous run, move it to `markdown/previous/v<N>-<timestamp>.md` first and append a DELTA.md entry.

The strategist's output uses this format:

```markdown
---
deck: <name>
audience: <from step 3>
intent: <from step 4>
tone: <from step 7>
design: <from step 6>
version: 1
generated_at: <ISO>
---

# Slide 01 — Title
> layout: title
> eyebrow: <small label>
> action_title: <main headline>
> support: <one-line subtitle>
> meta: { prepared_for, prepared_by, purpose }

---

# Slide 02 — Agenda
> layout: cols-3
> eyebrow: ...
> action_title: ...
> columns:
>   - title: ...
>     body: ...
>   - title: ...
>     body: ...
>   - title: ...
>     body: ...

---

(... and so on for every slide ...)

# Speaker Notes
## Slide 01
- ...
## Slide 02
- ...
```

The available `layout` types are documented in `slide-types.md`. Use only those layouts.

If `markdown/current.md` already exists (a re-run), move it to `markdown/previous/v<N>-<timestamp>.md` first, then append a new entry to `DELTA.md` describing what changed. Increment `version_count` in `.ideate/project.json`.

## Step 10 — Compile markdown → HTML

The skill ships with a deterministic Node compiler. Run:

```bash
node ~/.claude/skills/ideate/scripts/compile.js \
  ./<deck-name>/markdown/current.md \
  <design-choice> \
  ./<deck-name>/html/v<N>-<timestamp>.html
```

This reads the markdown, picks up the chosen design's tokens from `designs/<name>/design.json`, and emits a single self-contained HTML file. Zero npm dependencies.

If the user has applied overrides in `.ideate/design-choice.md` that the compiler doesn't natively support, fall back to in-Claude rendering: read the master template, substitute tokens manually, write the file.

## Step 11 — Pixel-perfect overflow detection (REQUIRED — DO NOT SKIP)

This is the gating check. Run the real overflow detector:

```bash
node ~/.claude/skills/ideate/scripts/check-overflow.js \
  ./<deck-name>/html/v<N>-<timestamp>.html
```

The detector spawns headless Chrome, navigates to the rendered HTML, waits for fonts to load, then for every `.slide` element measures:
- `scrollHeight − clientHeight` (vertical overflow)
- `scrollWidth − clientWidth` (horizontal overflow)
- Any descendant whose `getBoundingClientRect().bottom` extends past the slide's bottom

It emits a JSON report to stdout and exits 0 (pass) or 1 (fail).

**If any slide fails:**
1. Parse the JSON report. The `failures` array names each offending slide and lists the top 5 offenders by tag, class, text snippet, and overshoot in pixels.
2. Edit `markdown/current.md` to fix the offending slide:
   - Tighten action title (cut filler words)
   - Drop bullets to fit the layout's component constraint (see `slide-types.md`)
   - Move long body content to speaker notes
   - Split into two slides if the layout is fundamentally too dense
3. Recompile (Step 10) and re-check. Repeat until exit 0.

**Fallback when Node or Chrome are missing:**
- If `node` is unavailable, use the textual heuristics below (h1 length, list count, matrix rows, etc.)
- If Chrome is unavailable, the script will fail gracefully — fall back to heuristics.

**Textual fallback heuristics (one-time scan, in addition to or instead of pixel check):**
- `h1.action` longer than 140 characters → flag
- More than 14 list items inside a single column → flag
- Matrix table with more than 6 rows → flag
- Body paragraphs longer than 280 characters in a single block → flag
- More than 3 stacked components in one slide → flag

Tell the user: **"Pixel-perfect fit verified on all <N> slides. Ready to export PDF."**

## Step 12 — PDF export

Ask: **"Export to PDF now? (yes / not yet)"**

If yes, run `scripts/export-pdf.sh ./<deck-name>/html/<latest>.html ./<deck-name>/pdf/<name>-v<N>-<timestamp>.pdf`.

The script uses headless Chrome with a 1280×720 page size and zero margins. Confirm the PDF was created and report the path.

## Step 13 — Done

Tell the user:
- Where the markdown source lives (single source of truth)
- Where the HTML version lives
- Where the PDF lives
- That re-running `/ideate` from inside the project folder will iterate on the same deck (versioned)
- That editing `markdown/current.md` directly and asking Claude to "regenerate HTML" will re-render without re-running the wizard

## Re-entry behaviour

If the user invokes `ideate` from inside an existing project folder, detect this via `.ideate/project.json` and offer a shorter menu:

1. **Iterate content** — re-run from Step 8 with current markdown as starting point
2. **Switch design** — re-run from Step 6
3. **Just regenerate HTML** — re-run Steps 10–11 with no content changes
4. **Export PDF** — Step 12 only
5. **Add context and re-think** — re-run from Step 2

Always version, never overwrite. Always update `DELTA.md`.

## What NOT to do

- Do not invent statistics, dates, names, or events not in the user's context folder
- Do not skip the content-alignment validation step
- Do not write content directly into HTML — always go through markdown first
- Do not use emojis unless the user explicitly requests them
- Do not include speaker notes or "self-notes" inside the slides themselves — they belong in the speaker notes section of the markdown
- Do not reference any prior conversation, email, or meeting in the deck content unless the user explicitly tells you it's okay to do so
- Do not batch the wizard questions — one at a time, always
