---
name: ideate
description: Use when the user wants to create a pitch deck, slide deck, board deck, or presentation from raw context (emails, briefs, notes, source material). Guides them through a structured wizard - context gathering, design selection from pre-built McKinsey-style variations, intent capture, markdown source-of-truth generation, HTML rendering, content-alignment validation, and PDF export. Triggers on phrases like "make a pitch deck", "create a slide deck", "ideate a deck", "/ideate", or any request to turn source material into presentation slides.
---

# ideate — McKinsey-style deck wizard

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

## Step 9 — Generate the markdown source of truth

Write the deck content to `./<deck-name>/markdown/current.md` using this format:

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

## Step 10 — Render to HTML

Read the chosen design template from `~/.claude/skills/ideate/designs/<choice>/template.html`. The template uses placeholder tokens — substitute them with content from the markdown. Apply any user overrides from `.ideate/design-choice.md`.

Write the result to `./<deck-name>/html/v<N>-<timestamp>.html`.

## Step 11 — Content-alignment validation (REQUIRED — DO NOT SKIP)

This is the gating check. The user has been burned by content overflowing slides before. After rendering, you **must** verify content fits.

**Validation procedure:**

1. Read the rendered HTML.
2. For each slide, estimate content density using these heuristics:
   - **h1.action** longer than 140 characters → flag
   - More than 14 list items inside a single column → flag
   - Matrix table with more than 6 rows → flag
   - Body paragraphs longer than 280 characters in a single block → flag
   - More than 3 stacked components (h1 + table + callout + grid) in one slide → flag
3. If any slide flags, fix it before declaring done. Strategies:
   - Split content across two slides
   - Tighten language (cut filler words)
   - Move long content to speaker notes
   - Reduce font size on that specific slide
4. After fixes, re-validate. Repeat until zero flags.
5. Optional secondary check (if Chrome is available): run `scripts/check-fit.sh <html>` which uses headless Chrome to actually render at 1280×720 and screenshot each slide for visual inspection.

Tell the user: **"Validated content fit on all <N> slides. Ready to export PDF."**

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
