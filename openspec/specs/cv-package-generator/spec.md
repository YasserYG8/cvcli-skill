# cv-package-generator Specification

## Purpose
TBD - created by archiving change add-terminal-cv-cli. Update Purpose after archive.
## Requirements
### Requirement: Pack command
`cvcli pack <file>` SHALL validate the CV.md (stopping on errors), then create a package folder containing: `package.json`, `cv.json`, `bin/cli.js` (the viewer), `README.md`, `PUBLISHING.md`, `.gitignore`, `.gitattributes`, and `.github/workflows/check.yml` and `publish.yml`. It SHALL accept `--layout <name>` (`sidebar`, `classic`, `manpage`) and `--accent <color>` (`teal`, `blue`, `violet`, `green`, `amber`) and write them to `cv.json` as `display: { layout, accent }`, using the defaults (`sidebar`, `teal`) for values that are not given. An unknown value SHALL be refused with exit code 1, the list of valid values, and no folder created. With `--force`, the existing `display` values SHALL be kept for the flags that are not given.

#### Scenario: Successful pack
- **WHEN** the user runs `cvcli pack CV.md --name ada-cv --yes` on a valid file
- **THEN** the folder `./ada-cv/` exists with all the listed files, `cv.json` has `display` equal to `{ "layout": "sidebar", "accent": "teal" }`, and the command prints the three test/share commands (local, GitHub, npm)

#### Scenario: Invalid CV stops pack
- **WHEN** the CV.md has validation errors
- **THEN** no folder is created and the errors are printed with exit code 1

#### Scenario: Chosen look is saved
- **WHEN** the user runs pack with `--yes --layout classic --accent violet`
- **THEN** `cv.json` has `display` equal to `{ "layout": "classic", "accent": "violet" }`

#### Scenario: Unknown accent
- **WHEN** the user runs pack with `--accent pink`
- **THEN** pack exits with code 1, prints the valid accents, and creates no folder

#### Scenario: Update keeps the look
- **WHEN** `./ada-cv/cv.json` has layout `manpage` and accent `amber`, and the user runs pack with `--force --accent green`
- **THEN** the new `cv.json` has layout `manpage` and accent `green`

### Requirement: Package name
The package name SHALL default to the CV `name` turned into lowercase kebab-case plus `-cv` (e.g. "Yasser Gombra" → `yasser-gombra-cv`, accents removed), MAY be set with `--name`, and MUST be a valid npm package name (lowercase, URL-safe, max 214 characters). Invalid names SHALL be refused with an explanation.

#### Scenario: Default name
- **WHEN** the CV name is "Ada Lovelace" and no `--name` is given
- **THEN** the package name is `ada-lovelace-cv`

#### Scenario: Invalid name
- **WHEN** the user passes `--name "My CV"`
- **THEN** pack refuses with an error that names the rule that failed

### Requirement: Contact field selection
Before writing `cv.json`, pack SHALL ask which contact fields to include (email, phone, website, github, linkedin), with `phone` unselected by default, and SHALL show a warning that the package becomes public when pushed or published. With `--yes`, it SHALL use the defaults (all present fields except phone). `--include-phone` SHALL include the phone.

#### Scenario: Phone excluded by default
- **WHEN** the CV has a phone and the user runs pack with `--yes`
- **THEN** `cv.json` has no `phone` field

#### Scenario: Phone included on request
- **WHEN** the user runs pack with `--yes --include-phone`
- **THEN** `cv.json` contains the phone

### Requirement: Generated package is build-free and dependency-free
The generated `package.json` SHALL have a `bin` entry pointing to `bin/cli.js`, a `files` list that includes `bin/` and `cv.json`, `engines.node` `>=18`, and no `dependencies`, `devDependencies` or build scripts (`prepare`, `prepublishOnly`, `build`). `bin/cli.js` SHALL start with `#!/usr/bin/env node`.

#### Scenario: Works from a local folder
- **WHEN** the user runs `npx ./ada-cv --print` right after pack
- **THEN** the CV is printed, with no install step other than npx copying the folder

#### Scenario: Package contents
- **WHEN** `npm pack --dry-run` runs inside the generated folder
- **THEN** the listed files include `bin/cli.js`, `cv.json` and `package.json`

### Requirement: Repository field for npm
Pack SHALL accept `--repo <user/repo>` (or a GitHub URL) and write `repository.url` as `git+https://github.com/<user>/<repo>.git` in the generated `package.json`, because npm trusted publishing requires it to match the GitHub repo exactly. With `--force`, an existing `repository` field SHALL be kept when `--repo` is not given. An unrecognised value SHALL be refused.

#### Scenario: Repo given
- **WHEN** the user runs pack with `--repo ada/ada-cv`
- **THEN** `package.json` has `repository.url` equal to `git+https://github.com/ada/ada-cv.git`, and the README shows `npx github:ada/ada-cv`

#### Scenario: Bad repo value
- **WHEN** the user passes `--repo "not a repo"`
- **THEN** pack exits with code 1 and shows the expected `user/repo` shape

### Requirement: Safe output folder
Pack SHALL refuse to write into a folder that exists and is not empty unless `--force` is given. With `--force` it SHALL regenerate `cv.json`, `bin/cli.js`, `package.json` and the workflows, but SHALL keep the existing `package.json` `version`, the user's `README.md` and the `.git` folder.

#### Scenario: Folder exists
- **WHEN** `./ada-cv/` already has files and `--force` is not given
- **THEN** pack exits with code 1 and explains how to update (`--force`)

#### Scenario: Update keeps the version
- **WHEN** `./ada-cv/package.json` has version `1.2.0` and the user runs pack with `--force`
- **THEN** the new `package.json` still has version `1.2.0` and `cv.json` has the new CV content

### Requirement: LF line endings in the generated package
Every file that pack writes SHALL use LF (`\n`) line endings and SHALL NOT contain a CR (`\r`) character, whatever the line endings of the CV.md, the viewer source or the templates on disk. `bin/cli.js` SHALL start with `#!/usr/bin/env node` followed directly by LF. The generated `.gitattributes` SHALL contain the rule `* text=auto eol=lf`. Pack SHALL write `.gitattributes` only when the file does not exist yet, so `--force` keeps a user's own version.

#### Scenario: Sources have CRLF endings
- **WHEN** the viewer source, the templates and the CV.md on disk use CRLF line endings (a Windows checkout with `core.autocrlf=true`) and the user runs `cvcli pack CV.md --name ada-cv --yes`
- **THEN** no file in `./ada-cv/` contains `\r`, and the first line of `bin/cli.js` is exactly `#!/usr/bin/env node`

#### Scenario: Package has a line-ending rule
- **WHEN** the user runs pack into a new folder
- **THEN** the folder has a `.gitattributes` file that contains `* text=auto eol=lf`

#### Scenario: Update keeps the user's .gitattributes
- **WHEN** `./ada-cv/.gitattributes` already exists with the user's own content, and the user runs pack with `--force`
- **THEN** `./ada-cv/.gitattributes` still has the user's content

