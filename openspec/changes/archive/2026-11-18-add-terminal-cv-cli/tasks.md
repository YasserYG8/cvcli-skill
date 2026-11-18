## 1. Setup

- [x] 1.1 Create `cvcli/cli/` with `bin/cvcli.js` (shebang, command router for `check`, `view`, `pack`, `--help`, `--version`), `lib/`, `templates/`, `test/`
- [x] 1.2 Add root `package.json` (name `cvcli`, `type: module`, `bin.cvcli` → `cvcli/cli/bin/cvcli.js`, `files` → `cvcli/cli`, `engines.node >=18`, no dependencies, `test` script `node --test cvcli/cli/test/`)
- [x] 1.3 Add a fictional sample CV fixture (`cvcli/cli/test/fixtures/sample-cv.md`) that uses every section, plus invalid fixtures (missing name, wrong order, French, placeholders, unknown section)

## 2. CV.md parser and check command

- [x] 2.1 Implement front matter parsing (flat `key: value`, quotes removed, line-numbered errors) in `lib/parse.js`
- [x] 2.2 Implement section splitting with English and French names, order validation and unknown-section warnings
- [x] 2.3 Implement entry parsing (title — subtitle, meta line split on ` · `, `Tech:` line, bullets), skill groups and language lines
- [x] 2.4 Implement placeholder warnings (`[word?]`) with line numbers
- [x] 2.5 Implement `cvcli check` output (`file:line: message`) and exit codes 0 / 1 / 2
- [x] 2.6 Write parser tests for every scenario in `specs/cv-md-format/spec.md`
- [x] 2.7 Write the format-sync test: section names in `cvcli/templates/cv-full.md` equal the parser's known sections

## 3. Terminal viewer

- [x] 3.1 Implement `lib/viewer.js` `render(cv, {width, color})` for header and each section kind, with word wrap (width = min(columns || 80, 100))
- [x] 3.2 Implement `--print` / non-TTY mode (plain text, no ANSI codes) and `NO_COLOR`
- [x] 3.3 Implement interactive mode: alternate screen, section menu with letter shortcuts, left/right, up/down, PageUp/PageDown, `q`/Esc/Ctrl+C, resize re-render, terminal restore on exit and signals
- [x] 3.4 Make `viewer.js` runnable on its own (loads `../cv.json` next to itself when run as main)
- [x] 3.5 Implement `cvcli view <file>` (parse, stop on errors, render)
- [x] 3.6 Write viewer tests: `--print` output has no escape codes, no line exceeds the width at 60 columns, every section renders, standalone copy + cv.json works with `node cli.js --print`
- [x] 3.7 Manually test interactive mode on Windows Terminal/PowerShell and on Linux (WSL), and note results. Result (2026-11-18, by the maintainer): Windows Terminal OK (letter jump, counter, colors, `q` restores the prompt and cursor). Linux (WSL) not tested by a person; automated fake-terminal tests pass.

## 4. Pack command

- [x] 4.1 Implement package name default (kebab-case + `-cv`, accents removed), `--name` and npm name validation
- [x] 4.2 Implement contact field selection: interactive prompts (phone off by default), `--yes`, `--include-phone`, error when stdin is not a TTY without `--yes`, and the public-data warning
- [x] 4.3 Implement folder creation: `package.json` (bin, files, engines, no deps/scripts), `cv.json`, `bin/cli.js` (copied viewer + shebang), `.gitignore`
- [x] 4.4 Implement safe output: refuse non-empty folder without `--force`; with `--force` keep `version`, `README.md` and `.git`
- [x] 4.5 Print the three next commands (local, GitHub, npm) after a successful pack
- [x] 4.6 Write pack tests for every scenario in `specs/cv-package-generator/spec.md` (temp folders; npm-dependent checks skip when npm is missing)

## 5. Generated CI, README and PUBLISHING.md

- [x] 5.1 Check the current npm trusted-publishing docs (first publish, required npm/Node version, workflow permissions) and note the findings in design.md Open Questions
- [x] 5.2 Write `templates/check.yml` (Node 18 + lts/*, `npm pack --dry-run --json` assertion, `node bin/cli.js --print`)
- [x] 5.3 Write `templates/publish.yml` (tags `v*`, tag/version check, same checks, trusted publishing, `id-token: write`)
- [x] 5.4 Write `templates/README.md` (run commands for the three levels, "Ok to proceed?" note, link to cvcli)
- [x] 5.5 Write `templates/PUBLISHING.md` in simple English (5 steps, privacy warning, "Last reviewed" line), with the package name filled in by pack
- [x] 5.6 Add tests: generated files contain the real package name; workflows are valid YAML-shaped text with the expected triggers
- [x] 5.7 End-to-end check: pack the sample CV into a temp folder, run `npm pack --dry-run`, `node bin/cli.js --print` and `npx ./<folder> --print`

## 6. Skill handoff

- [x] 6.1 Add the final "terminal CV" step to `cvcli/references/full-cv.md` (offer, Node 18+ check, run check → fix errors → ask about placeholders → ask contact fields → pack → local test → next steps, never push or publish)
- [x] 6.2 Mention the step and the bundled CLI command (`node ${CLAUDE_SKILL_DIR}/cli/bin/cvcli.js`) in `cvcli/SKILL.md`; keep SKILL.md under 500 lines and the description under 1024 characters
- [x] 6.3 Update `compatibility` in SKILL.md frontmatter (Node.js 18+ for the terminal CV)

## 7. Repo docs and CI

- [x] 7.1 Add `.github/workflows/test.yml` for this repo: `pytest` (Python 3.9 and latest) and `node --test` (Node 18 and lts/*)
- [x] 7.2 Update `README.md`: terminal CV section with the three levels, the commands, and the MySeve-CLI lesson (no build step for GitHub installs)
- [x] 7.3 Update `CONTRIBUTING.md`: how to run Node tests and the zero-dependency rule for the CLI
- [x] 7.4 Run the full test suites (pytest + node --test) and the skill check script; all must pass
- [x] 7.5 Dry run on the user's private CV: `check` and `pack` `MyCv/CV.md` into a git-ignored folder, test with `npx ./<folder>`, and report (no push, no publish)
