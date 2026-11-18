## MODIFIED Requirements

### Requirement: Pack command
`cvcli pack <file>` SHALL validate the CV.md (stopping on errors), then create a package folder containing: `package.json`, `cv.json`, `bin/cli.js` (the viewer), `README.md`, `PUBLISHING.md`, `.gitignore`, and `.github/workflows/check.yml` and `publish.yml`. It SHALL accept `--layout <name>` (`sidebar`, `classic`, `manpage`) and `--accent <color>` (`teal`, `blue`, `violet`, `green`, `amber`) and write them to `cv.json` as `display: { layout, accent }`, using the defaults (`sidebar`, `teal`) for values that are not given. An unknown value SHALL be refused with exit code 1, the list of valid values, and no folder created. With `--force`, the existing `display` values SHALL be kept for the flags that are not given.

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
