## ADDED Requirements

### Requirement: Check workflow
Every generated package SHALL include `.github/workflows/check.yml`, which runs on push and pull request, sets up Node.js 18 and the current LTS, and fails if: `npm pack --dry-run` does not list `bin/cli.js` and `cv.json`, or `node bin/cli.js --print` exits with a non-zero code.

#### Scenario: Missing bin file fails CI
- **WHEN** a user deletes `bin/cli.js` and pushes
- **THEN** the check workflow fails with a message saying `bin/cli.js` is not in the package

#### Scenario: Healthy package passes
- **WHEN** a freshly packed folder is pushed to GitHub
- **THEN** the check workflow passes on both Node versions

### Requirement: Publish workflow
Every generated package SHALL include `.github/workflows/publish.yml`, which runs only when a tag matching `v*` is pushed, verifies that the tag equals `v` + the `package.json` version, runs the same checks as `check.yml`, and publishes to npm using npm trusted publishing (OIDC, `id-token: write`) so that no npm token is stored in the repository.

#### Scenario: Tag and version mismatch
- **WHEN** the user pushes tag `v1.1.0` but `package.json` says `1.0.0`
- **THEN** the workflow fails before publishing, with a message showing both versions

#### Scenario: Normal release
- **WHEN** the user bumps the version to `1.1.0`, commits, and pushes tag `v1.1.0` on a repo configured as a trusted publisher
- **THEN** the workflow publishes version 1.1.0 to npm

### Requirement: PUBLISHING.md guide
Every generated package SHALL include a `PUBLISHING.md` guide in simple English with numbered steps for: (1) testing locally with `npx ./<folder>`, (2) sharing from GitHub with `npx github:<user>/<repo>`, (3) the first npm publish, (4) connecting the GitHub repo as a trusted publisher on npmjs.com, and (5) updating the CV later (edit CV.md, run pack with `--force`, bump the version, push a tag). The guide SHALL include the package's real name and a privacy warning. The npm steps SHALL be checked against the current npm documentation when the guide template is written, and the template SHALL carry a "Last reviewed: <date>" line.

#### Scenario: Guide uses the real name
- **WHEN** a package is generated with the name `ada-cv`
- **THEN** PUBLISHING.md contains the commands `npx ./ada-cv`, `npm view ada-cv` and `npx ada-cv`

#### Scenario: GitHub level needs no npm account
- **WHEN** a user reads only steps 1 and 2
- **THEN** they can share their CV without creating an npm account

### Requirement: Generated README
Every generated package SHALL include a `README.md` that shows the run commands for the levels the user can use, explains that npx asks "Ok to proceed?" on the first run, and links to the cvcli project.

#### Scenario: README run commands
- **WHEN** a package named `ada-cv` is generated
- **THEN** its README contains `npx github:<user>/ada-cv` with a note to replace `<user>`, and `npx ada-cv`
