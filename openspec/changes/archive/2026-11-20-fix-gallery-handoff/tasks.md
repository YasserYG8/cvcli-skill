## 1. Tests first (keep fixtures clean)

- [x] 1.1 Add a `sampleIn(dir)` helper to `cvcli/cli/test/pack.test.js` that copies `fixtures/sample-cv.md` to `<dir>/CV.md`, and use it in every test that packs the sample from a temp folder
- [x] 1.2 Add a test that the fixtures folder only holds its known files after the pack tests
- [x] 1.3 Run `npm test`: all tests still pass with the current code (the helper changes nothing yet)

## 2. Default folder and duplicate guard

- [x] 2.1 In `cvcli/cli/lib/pack.js`, make the default folder `path.join(path.dirname(file), binName)`; `--out` still wins
- [x] 2.2 Add the duplicate guard (design.md Decision 3): only without `--out`, before any question or write, with exit code 1 and a message naming both folders and suggesting `--out <old> --force` or moving it
- [x] 2.3 Add tests: default folder next to a CV.md in a subfolder; `--out` wins; the guard refuses and creates nothing; the guard lets pack go on when `meta.name` differs

## 3. Gallery message

- [x] 3.1 Export `galleryChoiceMessage(file, choice, self)` from `pack.js` (next to `packCommandFor`) with the 4-line message from design.md Decision 1, and use it in `onChoice` in `cvcli/cli/bin/cvcli.js`
- [x] 3.2 Add tests for `galleryChoiceMessage` (the choice line, the AI line with `"<layout>, <accent>"`, and the pack command last), and check that `q` still prints no choice

## 4. Skill and docs

- [x] 4.1 `cvcli/references/style.md` step 3: tell the user that they only need to tell the AI their choice, and don't need to run the printed command
- [x] 4.2 README Terminal CV section: the default folder is next to CV.md (fix the `e.g. ./ada-lovelace-cv/` comment), and the gallery message

## 5. Verify

- [x] 5.1 Run `npm test` and `python -m pytest -q`; all pass
- [x] 5.2 Manual check in a temp folder: `pack sub/CV.md` creates `sub/<name>/`; with an old `./<name>/` package present, pack refuses with the clear message; `--out` works
- [x] 5.3 Check `git status`: nothing new in `cvcli/cli/test/fixtures/`, and the user's `yasser-gombra-cv/` in the repo root is untouched
