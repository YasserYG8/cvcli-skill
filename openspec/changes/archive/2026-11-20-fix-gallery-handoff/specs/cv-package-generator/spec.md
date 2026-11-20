## MODIFIED Requirements

### Requirement: Safe output folder
Without `--out`, pack SHALL create the package folder next to the CV.md file: `<folder of CV.md>/<bin-name>`, where `<bin-name>` is the package name without its `@scope/` prefix. With `--out <folder>`, pack SHALL use that folder. Pack SHALL refuse to write into a folder that exists and is not empty unless `--force` is given. With `--force` it SHALL regenerate `cv.json`, `bin/cli.js`, `package.json` and the workflows, but SHALL keep the existing `package.json` `version`, the user's `README.md` and the `.git` folder.

To avoid a second copy, when `--out` is not given, the default folder does not exist or is empty, and `./<bin-name>` in the current working directory is a different folder that holds a cvcli package (`package.json`, `cv.json` and `bin/cli.js`) whose `cv.json` has the same `meta.name` as the CV.md, pack SHALL create nothing and exit with code 1. Its message SHALL name both folders and say how to continue: pass `--out <that folder>` (with `--force`) to update the existing package, or move it next to CV.md.

#### Scenario: Default folder is next to CV.md
- **WHEN** the current folder is `/work`, and the user runs `cvcli pack docs/CV.md --name ada-cv --yes`
- **THEN** the package is created in `/work/docs/ada-cv/`, and nothing is created in `/work/ada-cv/`

#### Scenario: --out wins
- **WHEN** the user runs `cvcli pack docs/CV.md --name ada-cv --yes --out out/ada-cv`
- **THEN** the package is created in `out/ada-cv/`

#### Scenario: Old package in the current folder
- **WHEN** `./ada-cv/` in the current folder is a cvcli package for the same person, `docs/ada-cv/` does not exist, and the user runs `cvcli pack docs/CV.md --name ada-cv --yes --force`
- **THEN** pack exits with code 1, creates no folder, and the message names `./ada-cv` and `docs/ada-cv` and suggests `--out`

#### Scenario: Folder exists
- **WHEN** `./ada-cv/` already has files and `--force` is not given
- **THEN** pack exits with code 1 and explains how to update (`--force`)

#### Scenario: Update keeps the version
- **WHEN** `./ada-cv/package.json` has version `1.2.0` and the user runs pack with `--force`
- **THEN** the new `package.json` still has version `1.2.0` and `cv.json` has the new CV content
