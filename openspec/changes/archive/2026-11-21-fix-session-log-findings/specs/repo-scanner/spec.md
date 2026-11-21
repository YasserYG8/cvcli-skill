## ADDED Requirements

### Requirement: Skip files that git ignores
When the scanned folder is inside a git work tree, the scanner SHALL count only files that git tracks, plus untracked files that `.gitignore` and the other standard git exclude files do not ignore (`git ls-files --cached --others --exclude-standard`). A tracked file SHALL be counted even if a `.gitignore` rule matches it. The dependency, cache and hidden-folder rules that exist today SHALL still apply on top of this. The git history fields (`git.*`) SHALL NOT change because of this rule.

#### Scenario: Ignored folder with code
- **WHEN** a repo's `.gitignore` has `local-data/` and that folder holds `script.js` with 500 lines
- **THEN** `languages` does not count those 500 lines, and `skipped.ignored_by_git` counts that file

#### Scenario: New file not committed yet
- **WHEN** the user has a new file `src/new.py` that is not committed and not ignored
- **THEN** the scanner counts it in `languages`

#### Scenario: Tracked file that a rule matches
- **WHEN** `build.sh` is committed and a later `.gitignore` rule `*.sh` matches it
- **THEN** the scanner still counts `build.sh`

### Requirement: Scan without git
When the folder is not inside a git work tree, or the folder itself is ignored by its repo, or git is not installed, or `git ls-files` fails, the scanner SHALL scan the same files as before this change (folder walk with the existing skip rules) and SHALL NOT fail. If `git ls-files` fails inside a git work tree, the scanner SHALL add a line to `errors`.

#### Scenario: Plain folder
- **WHEN** the scanned folder has no `.git` and a file `app.py`
- **THEN** the scanner counts `app.py`, and `skipped.ignored_by_git` is `null`

#### Scenario: Scanned folder is ignored by its repo
- **WHEN** a repo ignores `side/` and the user scans `side/` directly
- **THEN** the scanner counts the files in `side/`, and `skipped.ignored_by_git` is `null`

#### Scenario: Git not installed
- **WHEN** git is not on PATH
- **THEN** the scan finishes, counts files from the folder walk, and `skipped.ignored_by_git` is `null`

### Requirement: Skip packed terminal CVs
The scanner SHALL skip, with all its contents, every folder that holds a cvcli terminal CV package: a folder that has `package.json`, `cv.json` and `bin/cli.js`, where `package.json` is a JSON object whose `keywords` list contains `"cvcli"`. This rule SHALL apply whether git tracks the folder or not. A folder that has only some of these files, or a `package.json` without the `cvcli` keyword, SHALL be scanned as usual.

#### Scenario: Packed CV tracked by git
- **WHEN** the repo commits `my-cv/` with `package.json` (keyword `cvcli`), `cv.json` and `bin/cli.js`
- **THEN** `languages` does not count `my-cv/bin/cli.js`, `manifests` does not list `my-cv/package.json`, and `skipped.cv_packages` lists `my-cv`

#### Scenario: Look-alike project
- **WHEN** a folder has `package.json`, `cv.json` and `bin/cli.js`, but `package.json` has no `cvcli` keyword
- **THEN** the scanner counts the folder like any other code

#### Scenario: Repo root is a packed CV
- **WHEN** the scanned folder itself is a packed CV
- **THEN** the scanner still scans it (the rule applies only to subfolders), so a user can scan their own CV repo on purpose

### Requirement: Report what was skipped
The scan JSON SHALL have a `skipped` object with two fields: `ignored_by_git` (the number of files that the folder walk found but git ignores, or `null` when the git rule did not run) and `cv_packages` (a sorted list of skipped CV package folders, as repo-relative paths with `/`, empty when none). `scanner_version` SHALL be `0.2.0`.

#### Scenario: Nothing skipped
- **WHEN** a git repo has no ignored files and no CV package
- **THEN** `skipped` is `{"ignored_by_git": 0, "cv_packages": []}`

#### Scenario: Version
- **WHEN** any folder is scanned
- **THEN** `scanner_version` is `"0.2.0"`
