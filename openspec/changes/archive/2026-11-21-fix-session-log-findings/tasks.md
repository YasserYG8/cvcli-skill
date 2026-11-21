## 1. Tests first

- [x] 1.1 In `tests/test_scan_repo.py`, add a test: a git repo with `.gitignore` `local-data/` and a code file inside it → the file is not in `languages`, and `skipped.ignored_by_git` is 1
- [x] 1.2 Add a test: an untracked, not-ignored file is counted; a committed file that a later `.gitignore` rule matches is still counted
- [x] 1.3 Add a test: a committed packed CV folder (`package.json` with keyword `cvcli`, `cv.json`, `bin/cli.js`) is not in `languages` or `manifests`, and is listed in `skipped.cv_packages`; the same folder without the `cvcli` keyword is counted
- [x] 1.4 Add a test: scanning a packed CV folder as the root still counts its files
- [x] 1.5 Add tests: a folder without git and the "git not installed" case give `skipped.ignored_by_git: null` and the same `languages` as before; `scanner_version` is `0.2.0`
- [x] 1.6 Run `pytest`: the new tests fail, the old tests pass

## 2. Scanner

- [x] 2.1 In `cvcli/scripts/scan_repo.py`, add `is_cv_package(path)` (design.md Decision 3) and use it in `walk_repo()` to prune subfolders and record their repo-relative paths (never the root)
- [x] 2.2 Add `git_visible_files(root, errors)`: inside a git work tree, run `git ls-files -z --cached --others --exclude-standard` and return a set of NFC-normalized `/` paths; return `None` outside git, when git is missing, or on failure (and add an `errors` line only when the folder is a git work tree)
- [x] 2.3 In `scan()`, filter the walked files with that set, count the dropped files, and add `skipped: {"ignored_by_git", "cv_packages"}` to the result
- [x] 2.4 Set `SCANNER_VERSION = "0.2.0"`
- [x] 2.5 Run `pytest`: all tests pass, on the local Python (3.10; CI covers 3.9 and the latest)

## 3. Skill text

- [x] 3.1 `cvcli/SKILL.md`, "How to talk to the user": add rule 4, "Show what you found": when you ask about a fact found in a source, show the value and the source, with a default
- [x] 3.2 `cvcli/SKILL.md`, "Scan a repo": if you save the JSON, save it in the system temp folder or your scratch folder, never in the user's folders
- [x] 3.3 `cvcli/SKILL.md`, fact sheet: the Flags line names folders from `skipped.cv_packages` as generated terminal CVs that were not counted
- [x] 3.4 `cvcli/references/full-cv.md` step 4: change the contact details line to show found values, with the phone example and default "no" for phone and street address

## 4. Check on a real repo

- [x] 4.1 Scan this repo (it has the git-ignored `yasser-gombra-cv/` and `MyCv/`): `cvcli/cli/bin/cvcli.js` lines are still counted, but no line from `yasser-gombra-cv/` is, and `skipped.ignored_by_git` is above 0
- [x] 4.2 Run `git status`: no scan JSON or other new file in the repo
