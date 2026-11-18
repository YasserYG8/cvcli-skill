## 1. Foundations

- [x] 1.1 Add `visibleWidth()` (ignores escape codes) and use it for all padding, clipping and wrapping in `lib/viewer.js`
- [x] 1.2 Add a frame test helper in `test/` that renders a layout with a fake `{ columns, rows }` and color depth (no real terminal)
- [x] 1.3 Reserve `q`, `t` and `a` in `assignKeys`, and add a test with a section title starting with `T`

## 2. Color roles and accents

- [x] 2.1 Define the roles (`accent`, `text`, `strong`, `muted`, `border`, `success`) and the five accents (`teal`, `blue`, `violet`, `green`, `amber`) with 24-bit, 256 and 16-color values
- [x] 2.2 Pick the accent hex values with a contrast check on `#1e1e1e` and `#ffffff` (headings ≥ 3:1) and record them in design.md Open Questions
- [x] 2.3 Detect depth with `stdout.getColorDepth()`, keep `colorEnabled()` (`NO_COLOR`) first, and remove the faint and inverse styles
- [x] 2.4 Write tests: 16, 256 and 24-bit codes, only accent codes differ between accents, and no color codes with `NO_COLOR` or depth 1

## 3. Components

- [x] 3.1 Implement `header`, `statusBadge`, `sectionTitle` and `footer`
- [x] 3.2 Implement `entry` (title, subtitle, right-aligned date part when it fits, meta, tech tags, `▸` bullets) without changing any text
- [x] 3.3 Implement `tagList`, `keyValue` and `paragraphs`
- [x] 3.4 Implement `navList`, `navLine` and `box` (rounded frame with joins)

## 4. Layouts

- [x] 4.1 Create the layout registry (`sidebar`, `classic`, `manpage`; `nav: paged | page`) and the defaults (`sidebar`, `teal`)
- [x] 4.2 Implement `sidebar`: a centered card at most 100 wide, full height, left list, body scroll with %, and the `navLine` fallback below 72 columns
- [x] 4.3 Implement `classic`: two columns (30% left, min 24) joined into one page, heading jump targets, and stacking below 90 columns
- [x] 4.4 Implement `manpage`: top and bottom lines, uppercase headings, indented bodies, and `SYNOPSIS` only when the package name is known
- [x] 4.5 Implement the shared small-terminal rule: no outer box below 60 columns or 16 rows
- [x] 4.6 Write the size-matrix tests (every layout × section × 40×12, 60×24, 80×24, 100×30, 160×50) and the content tests (all section and entry titles appear)

## 5. Controller, switch and gallery

- [x] 5.1 Rewrite the interactive loop to call `layout.frame(state, size)`, with paged keys for `sidebar` and page keys (jump to heading, Space, Home, End) for `classic` and `manpage`
- [x] 5.2 Read `display` from `cv.json` with a silent fallback for unknown values, and let `--layout` and `--accent` override it
- [x] 5.3 Implement `t` (next layout, keep the current section, no file writes) and show the layout name in the footer
- [x] 5.4 Implement gallery mode: banner, `t`/`a`/Enter/`q`, return the choice, and exit code 2 when not a TTY
- [x] 5.5 Write key tests: `t` cycle, page jumps, `q` restores the terminal, the gallery `t a a Enter` result, and the non-TTY gallery error

## 6. CLI and pack

- [x] 6.1 Add `--layout`, `--accent` and `--gallery` to `cvcli view` (exit 2 with the valid values on unknown input) and print the `cvcli pack …` command after a gallery choice
- [x] 6.2 Add `--layout` and `--accent` to `cvcli pack`: validate (exit 1, no folder), write `display`, and keep the existing values with `--force`
- [x] 6.3 Update the help texts in `bin/cvcli.js` and the packaged viewer `--help`
- [x] 6.4 Write pack tests for every scenario in `specs/cv-package-generator/spec.md`

## 7. Docs and checks

- [x] 7.1 Update `README.md` (layouts, accents, gallery, new flags) and `templates/README.md` (the `t` key)
- [x] 7.2 Mention `--gallery`, `--layout` and `--accent` in the terminal CV step of `cvcli/references/full-cv.md` (the skill asks the user which look they want, then passes flags)
- [x] 7.3 Run `npm test` and `pytest`, and check that the existing `--print` tests pass unchanged
- [x] 5.6 Sidebar: ↑/↓ follow the section list (scroll a long section first, then move; stop at the ends), update the footer hints, and add key tests (feedback from the manual test)
- [x] 7.4 Manually test the three layouts and the gallery on Windows Terminal at full screen and at a small window size, and note the results here. Result (2026-11-18, by the maintainer): Windows Terminal OK for `sidebar`, `classic`, `manpage` and the gallery, at full screen and in a small window; borders reach the edge and `▌ ▸ ● ╭` render. Feedback from the test led to task 5.6 (↑/↓ change sections in `sidebar`) and to printing a copy-and-paste pack command (`node <path>/cvcli.js …` instead of an uninstalled `cvcli`). Linux and macOS not tested by a person.
