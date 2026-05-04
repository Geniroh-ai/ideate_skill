# Design variations

Six pre-built design variations. Each is a self-contained 1280×720 HTML template with embedded CSS and Google Fonts. Pick by number when prompted.

| # | Name | One-line | Best for |
|---|---|---|---|
| 1 | **mckinsey-classic** | Editorial serif headlines (Fraunces) on warm paper, navy + BC red, action-titled slides | Strategy decks, partnership proposals, board pitches |
| 2 | **mckinsey-sleek** | Sleek sans-serif (Inter) headlines on warm paper, navy + restrained red. Same structure as classic but no italic serif. | Modern strategy decks, executive proposals |
| 3 | **bcg-monochrome** | Almost-black on cream, single accent green, generous whitespace, tight monochrome charts | Diagnostic / data-led decks, consulting reports |
| 4 | **bain-bold** | Strong red verticals, charcoal headlines, large stat callouts, structured grids | Sales decks, investor updates, growth pitches |
| 5 | **editorial-noir** | Dark charcoal background, ivory text, serif display, warm gold accent | High-impact opening / closing decks, board theatre |
| 6 | **modern-minimal** | Off-white, charcoal, single accent (cobalt), sans-serif throughout, very tight type scale | Startup pitches, product launches, internal alignment |

## How design selection works

When the user picks a number in Step 6:
1. Read `designs/<name>/design.json` for tokens (colours, fonts, spacing).
2. Read `designs/<name>/template.html` as the rendering shell.
3. Apply any user overrides captured in `.ideate/design-choice.md`.
4. Substitute slide content from `markdown/current.md` into the template's slide layouts.

## Adding more designs

To extend the catalogue, drop a new folder under `designs/` with `template.html` and `design.json`, then add a row to this index. The skill will automatically pick it up on next invocation.
