## Context

`add-terminal-cv-cli` (archived 2026-11-18) shipped a working viewer, `cvcli/cli/lib/viewer.js`: one self-contained file, built-ins only, copied by `pack` to `<package>/bin/cli.js`. The rendering in that file is one function that mixes content, arrangement and colors. On a real CV (manual test, Windows Terminal), the result looks unfinished: content sits in the top-left corner, the 9-item menu wraps onto two lines, and the basic ANSI colors (cyan, yellow, green, inverse) look different on every terminal theme.

These decisions were made with the maintainer in explore mode:
1. **Who picks the look:** both. The owner sets the default at pack time, and the viewer can switch with `t`.
2. **v1 layouts:** `sidebar` (A), `classic` (D), `manpage` (E).
3. **Themes:** one accent color plus neutral grays. Named palettes wait for v2.
4. **Gallery:** yes, `cvcli view CV.md --gallery`.

Constraints that still hold: zero dependencies, no build step, Node 18+, one viewer file, `--print` stays plain text, and content stays honest (no invented data such as skill bars or a fake package name).

## Goals / Non-Goals

**Goals:**
- A small design system (roles → components → layouts), so a new layout is mostly an arrangement of existing components.
- Three layouts that look professional at common sizes and still fit at very small ones.
- An owner choice saved in `cv.json`, a live `t` switch for viewers, and a gallery for owners.
- Tests that check every layout at many terminal sizes.

**Non-Goals:**
- Named palettes, the other layout ideas (tabs, scrolling document, shell session, minimal), user-defined layouts, mouse support, animations.
- Changing the CV.md format or `--print` output.
- Detecting the terminal background (light or dark).

## Decisions

### 1. Three layers inside one file
`viewer.js` is organised in this order: **tokens** (color roles per accent and depth) → **components** (pure functions `(data, width, style) → string[]`) → **layouts** (a registry `{ sidebar, classic, manpage }`, where each entry has `nav: "paged" | "page"` and `frame(state, size) → string[]` returning exactly `rows` lines) → **controller** (keys, state, terminal setup, the same as today).
- Why: one layout only places components, so a fourth layout costs about 100 lines and no new styling code.
- Alternative: one file per layout, with `pack` joining them. Rejected: joining files is a build step, which is the MySeve-CLI lesson, and `view` and the package must run the same bytes.
- Alternative: keep one function with `if (layout === …)` branches. Rejected: this is the tangle we are fixing.

### 2. Components
`header`, `statusBadge`, `sectionTitle`, `entry` (title, subtitle, a right-aligned date when it fits, a meta line, tech tags, bullets `▸`), `tagList` (`Go · Docker · GitHub Actions`), `keyValue` (aligned labels for skills, languages and contact), `paragraphs`, `navList`, `navLine` (`‹ Projects 3/9 ›`), `footer` and `box` (draws `╭─╮│╰╯├┤┬┴` around already-rendered lines).
- **Dates:** the parser keeps the meta line as an array of parts split on ` · `. A part is treated as a date when it matches a year (`19xx`, `20xx`) or "Present"/"Aujourd'hui". Only that part moves to the right, and the text is never changed. If no part matches, the meta line stays as it is.
- **Measuring width:** a `visibleWidth()` helper removes escape codes before counting characters. All padding and clipping uses it. The current `len()` counts escape codes, which is why the menu had to be wrapped by hand.

### 3. Layout details
- **sidebar:** the card width is `min(columns, 100)`, centered with `floor((columns - width) / 2)` spaces. It uses the full height. The left list width is the longest `title + key` plus 4. The body area scrolls, and a scroll percentage shows in the footer when the body is taller than the area. Below 72 columns, the list becomes `navLine`.
- **classic:** the left column is 30% of the width (minimum 24 columns), with a vertical rule between the columns. Both columns are rendered to full length, joined row by row, and scrolled together as one page. A section's jump target is the row of its heading. Below 90 columns, the columns are stacked (left first).
- **manpage:** the top line is `NAME(1)  Curriculum Vitae  NAME(1)`. Headings are uppercase bold in the accent color, and bodies are indented 7 columns (3 below 60 columns). The bottom line repeats the name. `SYNOPSIS` appears only when the viewer knows the package name from `../package.json`.
- **All layouts:** below 60 columns or 16 rows, there is no outer box. The header shrinks to the name and title, and the status badge goes on its own line.

### 4. Color roles and depth
The roles are `accent`, `text` (the terminal's default foreground, which works on dark and light themes), `strong` (bold default foreground), `muted`, `border` and `success`. The depth comes from `stdout.getColorDepth()`, a built-in in Node 18 that already handles `NO_COLOR`, `FORCE_COLOR`, `COLORTERM` and Windows Terminal:
- 24 bits: hex values per accent (mid-lightness colors, chosen for contrast on dark and light backgrounds).
- 8 bits: the nearest xterm-256 index for each value.
- 4 bits: basic ANSI (teal→cyan, blue→blue, violet→magenta, green→green, amber→yellow; `muted`/`border` → bright black `90`).
- 1 bit: no color codes, only bold.
- Our own `colorEnabled()` check stays first, so `NO_COLOR` wins even if a terminal reports colors.
- Alternative: the faint attribute (`2`) for muted text. Rejected: some terminals render it badly. This is also the current look.
- Alternative: inverse video for the selected item. Rejected: it looks heavy, and the `▌` marker plus bold works with and without color.

### 5. Where the look is stored
`cv.json` gets an optional `display: { layout, accent }`, written by `pack`. The viewer reads it, checks it against the registry and the accent list, and falls back to the defaults without an error. `CV_FORMAT` stays `1`: the field is optional, and the packaged viewer always ships with its own `cv.json`.
- Alternative: front matter keys in CV.md. Rejected: CV.md is content and a public contract (`cv-md-format`), and the look is a presentation choice.
- Alternative: a `cvcli` field in `package.json`. Rejected: the viewer reads `cv.json` first, and one input file is simpler.

### 6. Keys
In `sidebar`, ↑/↓ follow the vertical section list (feedback from the first manual test: the user expected ↑/↓, not ←/→, to change sections). ↓ scrolls first when the section is longer than its area, then opens the next section. ↑ scrolls back, then opens the previous one. They stop at the first and last section, while ←/→ wrap around. So a long section can always be read to the end with ↓ alone. Alternative: ↑/↓ only change sections and PgUp/PgDn scroll. Rejected: people would miss the end of long sections.
`q`, `t` and `a` are reserved in `assignKeys`, so section shortcuts never use them. `t` always cycles the layouts. `a` cycles the accents only in gallery mode, and does nothing in normal mode. Viewers get one simple toy, and owners get the full choice. On a layout switch, the current section index is kept. Paged layouts open it, and page layouts scroll to its heading.

### 7. Gallery
`--gallery` is the normal interactive viewer with `gallery: true`. It adds a one-line banner at the top (`Gallery · classic · violet · t layout · a accent · Enter choose · q quit`), and Enter resolves with the choice. After the terminal is restored, `bin/cvcli.js` prints `cvcli pack <file> --layout <l> --accent <a>`. A non-TTY gallery returns exit code 2 before any escape code is written.

### 8. Tests
- A frame test helper renders each layout with a fake `{ columns, rows }` and color depth, with no real terminal.
- Size matrix: every layout × every section × sizes 40×12, 60×24, 80×24, 100×30, 160×50. Each frame must have exactly `rows` lines, and no visible line can be wider than `columns`.
- Content: every section title and entry title from the sample CV appears in each layout.
- Colors: the 16, 256 and 24-bit codes are used as expected, only accent codes differ between accents, and `NO_COLOR` frames have no `\x1b[3x`/`38;` codes.
- Keys: `t` cycles and changes no files, reserved letters work, the gallery's `t`, `a`, `a`, Enter flow prints the right command, and a non-TTY gallery exits with 2.
- Pack: the `--layout`/`--accent` defaults, refusal of unknown values, and `--force` keeping `display`.
- The existing `--print` tests stay unchanged and must still pass.

## Risks / Trade-offs

- [`viewer.js` grows from ~370 to an estimated ~900 lines] → It stays one file with clear sections and is still small for `npx`. Each layout is tested on its own through the frame helper.
- [Box-drawing characters or `▌`/`▸` show as `?` in old Windows consoles or odd fonts] → Windows Terminal and modern PowerShell are fine. `--print` is always plain. An ASCII border fallback can be added later if users report it.
- [Wide characters (CJK, emoji) count as one column, so a border can shift] → CVs written by the skill are mostly Latin text. This is noted as a known limit, and the width tests use the sample CV.
- [Accent contrast on light terminal themes] → Mid-lightness values are checked against both a dark (`#1e1e1e`) and a light (`#ffffff`) background during implementation (aim: contrast ratio ≥ 3:1 for headings).
- [The `classic` two-column split can put a long left column next to a short right column] → The rows are joined, so the page is as long as the longer column. Empty space appears only on one side.
- [Reserving `a` and `t` changes the shortcuts of some French or custom section titles] → The shortcut picks the next free letter of the title. A test covers a title starting with `T`.

## Migration Plan

- Packages made before this change have no `display` field, so they keep working and open in `sidebar` with `teal` after a `pack --force` update. Old packages that are not updated keep the old viewer copied inside them, so nothing changes for them.
- Rollback: revert `viewer.js`, `pack.js` and `bin/cvcli.js`. A `cv.json` that has a `display` field still works with the old viewer, which ignores the field.

## Open Questions

- ~~The exact hex values for the five accents~~ Picked 2026-11-18 with a WCAG contrast check (ratio on `#1e1e1e` / on `#ffffff`): teal `#1a9e9e` (5.10 / 3.27), blue `#4a8ae8` (4.84 / 3.45), violet `#9a72e6` (4.70 / 3.55), green `#3d9e4f` (4.92 / 3.39), amber `#c07f12` (4.99 / 3.34). Neutrals: muted `#8a8a8a` (4.83 / 3.45), border `#707070` (3.37 / 4.95), success `#3d9e4f`. All are ≥ 3:1 on both backgrounds.
- Implementation note: each line is cleared with `[2K` *before* it is written (not `[K` after), because erasing after a full-width line removes its last character (the right border) in terminals with deferred wrap.
- Should `a` also cycle accents for viewers (not only in the gallery)? It is off for v1, and we can decide after real use.
