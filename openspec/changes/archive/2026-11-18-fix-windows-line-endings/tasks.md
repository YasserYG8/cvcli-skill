## 1. Repo line endings

- [x] 1.1 Add the root `.gitattributes` (`* text=auto eol=lf` plus the binary rules from design.md Decision 4)
- [x] 1.2 Check that `git add --renormalize .` stages no file other than `.gitattributes`

## 2. Pack writes LF

- [x] 2.1 Add and export a `writeText(file, content)` helper in `cvcli/cli/lib/pack.js` that turns `\r\n` and lone `\r` into `\n` before writing
- [x] 2.2 Route every text output of pack through `writeText`: `package.json`, `cv.json`, `.gitignore`, both workflows, `PUBLISHING.md`, `README.md`
- [x] 2.3 Replace `copyFileSync` for `bin/cli.js` with read + `writeText`, keeping the `chmod 0o755`
- [x] 2.4 Write `.gitattributes` (`* text=auto eol=lf`) into the package only when it does not exist yet

## 3. Tests

- [x] 3.1 Make the `--force keeps version, README.md and .git` test change the title with a regex that accepts `\r?\n`
- [x] 3.2 Make the `workflows have the expected triggers and checks` test independent of the checkout's line endings
- [x] 3.3 Add a test: pack a CRLF copy of the sample CV and check that no generated file contains `\r` and that `bin/cli.js` starts with `#!/usr/bin/env node\n`
- [x] 3.4 Add a unit test for `writeText` with CRLF and lone-CR input, so Linux CI also covers CRLF sources
- [x] 3.5 Add tests: a new package has `.gitattributes` with `* text=auto eol=lf`, and `--force` keeps a user's own `.gitattributes`
- [x] 3.6 Run `npm test` and `python -m pytest -q`; all tests pass on Windows

## 4. Verify and refresh

- [x] 4.1 Refresh the local working tree to LF (design.md Migration Plan step 2) and confirm `git ls-files --eol` shows `w/lf` for text files
- [x] 4.2 Pack `MyCv/CV.md` into the scratchpad again and confirm no generated file contains `\r`
- [x] 4.3 Check README.md, SKILL.md and the references for a list of generated package files, and add `.gitattributes` where such a list exists
