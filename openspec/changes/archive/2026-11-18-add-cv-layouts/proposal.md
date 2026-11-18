## Why

The terminal viewer works, but it looks unfinished. Everything is in the top-left corner, the section menu wraps onto two lines when there are 9 sections, the visual hierarchy is weak, and the colors are random basic ANSI colors that change from one terminal theme to another. CV owners also want to choose a look that fits them. One fixed design is not enough.

## What Changes

- A small **design system** inside the viewer: color roles (accent, text, muted, border, success), reusable components (header, status badge, navigation, section title, entry, tag list, key-value list, footer) and a layout registry.
- **Three layouts in v1**, each built from the same components:
  - `sidebar` (default): a centered, framed card with a vertical section list on the left and one section at a time on the right.
  - `classic`: a paper-CV style with two columns (contact, skills and languages on the left; summary, experience and projects on the right), scrolled as one page.
  - `manpage`: the CV written like a Unix manual page (`NAME`, `DESCRIPTION`, `EXPERIENCE`…), scrolled as one page.
- Each layout has a **narrow fallback**, so it still fits when the terminal is too small for it (for example, `classic` becomes one column).
- **Accent themes**: the owner picks one accent color from a fixed list (`teal`, `blue`, `violet`, `green`, `amber`). Everything else uses neutral grays. The colors adapt to the terminal's color depth (truecolor, 256 or 16 colors), and the design never depends on color alone (`NO_COLOR` still works).
- **The owner picks, and the viewer can switch**: `cvcli pack --layout <name> --accent <color>` saves the choice in `cv.json` under a new optional `display` field. In the interactive viewer, the `t` key cycles through the layouts for the current session only.
- **Preview flags and a gallery**: `cvcli view CV.md --layout <name> --accent <color>` previews one look, and `cvcli view CV.md --gallery` lets the owner try every layout and accent on their real CV. Pressing Enter prints the matching `cvcli pack` command.
- `--print` output stays the same plain text for every layout, so it is easy to copy and pipe.
- Non-goals: named full palettes (nord, gruvbox…), the B/C/F/G layout ideas (tabs, scrolling document, shell session, minimal), custom user layouts, and mouse support. These can come in a later change.

## Capabilities

### New Capabilities
- `cv-layouts`: the layout registry, the three v1 layouts (`sidebar`, `classic`, `manpage`), their narrow fallbacks, the `t` layout switch, the `display` field in `cv.json`, and the `--gallery` mode.
- `cv-accent-themes`: the color roles, the accent list, color-depth detection and fallback, and the no-color rules.

### Modified Capabilities
- `terminal-cv-viewer`: interactive navigation now depends on the layout (paged section list or one scrolled page with letter jumps to headings), `t` is reserved, and `cvcli view` accepts `--layout`, `--accent` and `--gallery`.
- `cv-package-generator`: `pack` accepts `--layout` and `--accent`, refuses unknown values, writes `display` to `cv.json`, and keeps the existing `display` with `--force` when the flags are not given.

## Impact

- `cvcli/cli/lib/viewer.js`: a large rewrite of the interactive rendering. It stays **one self-contained file** with built-ins only, because `pack` copies it as `bin/cli.js`.
- `cvcli/cli/lib/pack.js` and `cvcli/cli/bin/cvcli.js`: new flags and help text, plus the `display` field.
- `cv.json`: a new optional `display` object. The format number stays `1` because the field is optional and the viewer ships with its own data.
- Tests in `cvcli/cli/test/`: layout width tests at several terminal sizes, key tests for `t` and the gallery, color-depth tests, and pack tests for the new flags.
- `README.md` and the generated package `README.md` template: show the layouts and the new flags.
- The CV.md format (`cv-md-format`) does **not** change. The look is not part of the CV content.
