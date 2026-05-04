# Slide layout catalogue

Pick the right layout for the right content. Every slide in the markdown source must declare a `layout` from this list.

## title
Opening slide. Hero typographic treatment, deck title, subtitle, prepared-for/prepared-by/purpose tri-column at the bottom.

## agenda / cols-3
Three equal-weight columns introducing the structure of what's to come. Each column has a number, a one-line title, a horizontal rule, and a 1–2 sentence body. Ideal for "three questions answered in N slides".

## section-divider
Full-bleed dark slide with oversized numeral and a one-line section name in serif italic. Use between sections (3–4 per deck max).

## stat-row
A row of 3–4 large numerical callouts under an action title. Each stat: huge numeric, one-line context, optional sup-script. Best for opening "the macro" slides.

## matrix-3col / matrix-4col
Standard McKinsey table. 3–6 rows max. First column bold, remaining columns supporting. Headers in small caps. Use for comparison, current-vs-future, owner allocation.

## cols-2
Two-column body slide. Each column gets a kicker, a horizontal rule, and either a paragraph or a bulleted list. Use for "the shift" / "what changes" / "before vs after" framings.

## cols-3-detail
Three columns, each with a kicker + serif sub-headline + bullet list. Used for use cases A/B/C.

## cols-4
Four equal columns. Tight bullets only. Best for "four moats" / "four pillars" type slides. Avoid if any column has more than 4 bullets.

## flow
Horizontal process flow with 3–5 steps. Each step has a small numeric label, title, and one-line body. Use for "how it works" / "the pipeline" / "stages of engagement".

## quad / cgrid
2×2 grid of bordered boxes. Use for the 4Cs / four-pillar treatments where each cell is roughly equal weight.

## iconlist
Vertical list of 3–5 numbered items, each with a bordered numeric badge + headline + body. Use for "next steps" / "what we propose" type slides.

## closing
Centered editorial quote slide. One large statement, a divider rule, and a short signoff. Always the last slide.

## Component constraints — gating rules for the validator

- `h1.action` — never longer than 140 characters
- `cols-3` body bullets — max 4 items per column
- `cols-4` body bullets — max 3 items per column
- matrix tables — max 6 rows, max 4 columns
- stat-row — max 4 stats
- flow — max 5 steps
- quad / cgrid — exactly 4 cells, each cell body max 220 characters
- iconlist — max 5 items
- Speaker notes / asides ("Strategic note", "Our posture", etc.) — NEVER on the slide. Always in the speaker notes section of the markdown.
