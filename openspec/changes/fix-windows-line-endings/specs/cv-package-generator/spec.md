## MODIFIED Requirements

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

## ADDED Requirements

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
