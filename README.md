# ideate — McKinsey-style pitch-deck wizard for Claude Code

A Claude Code plugin that turns raw context (emails, briefs, notes) into versioned, McKinsey-aesthetic pitch decks through a guided conversational wizard.

## What it does

Run `/ideate` (or just say "make a pitch deck") and Claude will walk you through a 13-step wizard:

1. Resolve project location → 2. Scaffold a structured repo → 3. Gather context → 4. Audience → 5. Strategic intent → 6. Key takeaways → 7. Design selection (6 pre-built McKinsey-style variations) → 8. Tone calibration → 9. Length & outline → 10. Generate markdown source-of-truth → 11. Render to HTML → 12. **Content-alignment validation** (gating check — no overflow tolerated) → 13. PDF export

Every project gets its own folder with:

```
<deck-name>/
├── .ideate/                # state + design choice
├── context/                # source material lives here
├── assets/                 # extracted images, logos, screenshots
├── markdown/
│   ├── current.md          # source of truth
│   ├── previous/           # versioned snapshots
│   └── DELTA.md            # human-readable changelog
├── html/                   # rendered, timestamped
└── pdf/                    # exported, timestamped
```

## Why a wizard

Decks fail when content races ahead of intent. The wizard forces the order: *who is this for → what should it do → what should they remember → how should it look*. Then content is written *to* that brief, not the other way round.

## Why markdown is the source of truth

You can edit `markdown/current.md` directly and ask Claude to "regenerate HTML". You don't have to re-run the wizard. The HTML is always derivable from the markdown — never the other way round.

## Design variations included

| # | Name | Best for |
|---|---|---|
| 1 | mckinsey-classic | Strategy decks, partnership proposals, board pitches |
| 2 | mckinsey-sleek | Modern strategy decks, executive proposals |
| 3 | bcg-monochrome | Diagnostic / data-led decks |
| 4 | bain-bold | Sales decks, investor updates |
| 5 | editorial-noir | High-impact opening / closing decks |
| 6 | modern-minimal | Startup pitches, product launches |

Add your own by dropping a new folder under `skills/ideate/designs/` with a `design.json`.

## Installation

### As a personal skill (single user)

```bash
git clone <this-repo> /tmp/ideate
cp -R /tmp/ideate/skills/ideate ~/.claude/skills/
```

### As a plugin (shareable across a team)

```bash
# Add to your Claude Code plugin marketplace
claude plugin add <git-url>
```

Or install manually:
```bash
mkdir -p ~/.claude/plugins
git clone <this-repo> ~/.claude/plugins/ideate
```

## Requirements

- Claude Code (CLI, VS Code, JetBrains, or claude.ai/code)
- For PDF export: Google Chrome / Chromium / Edge installed locally
- For visual fit-check: same as PDF export

## Usage

Inside Claude Code:

```
> /ideate
```

or just type:

```
> make me a pitch deck for our Q3 board update
```

Claude will detect the intent and start the wizard.

## Re-running on the same deck

If you `cd` into an existing `<deck-name>/` folder and run `/ideate`, Claude detects the project and offers a shorter menu:

1. Iterate content
2. Switch design
3. Regenerate HTML only
4. Export PDF
5. Add context and re-think

Versions are kept in `markdown/previous/` and the `DELTA.md` changelog tracks what changed across iterations.

## License

MIT
