## ADDED Requirements

### Requirement: Show the value found in a source
When the skill asks the user whether to use, show or change a fact that it already found in one of the user's sources (an old CV, a website, a profile text, a repo), the question SHALL show the value it found and name the source. The question SHALL still give a default. For a phone number or a street address, the default SHALL be "no" (leave it out). The value SHALL be shown only in the conversation with the user, never in files or outside services.

#### Scenario: Phone found in the old CV
- **WHEN** the old CV PDF has a phone number and the skill asks about contact details
- **THEN** the question shows the number and says it comes from the PDF, for example "Your PDF has the phone +216 …. Show it on the CV? (default: no)"

#### Scenario: Fact not found
- **WHEN** no source has a phone number
- **THEN** the skill says it found no phone and asks if the user wants to add one (default: no)

### Requirement: Scan output stays out of user folders
If the agent saves the scanner's JSON output to a file, it SHALL save it in the system temp folder (or the client's scratch folder), never in the scanned repo, the folder of CV.md, or any other user folder.

#### Scenario: Agent saves the scan
- **WHEN** the agent scans `~/code/shop-api` and wants to keep the JSON to read it in parts
- **THEN** the file is written under the temp folder, and `git status` in `~/code/shop-api` shows no new file

### Requirement: Fact sheet mentions skipped CV packages
When the scan JSON lists folders in `skipped.cv_packages`, the project fact sheet SHALL say in its Flags line that those folders were not counted because they are generated terminal CVs.

#### Scenario: Repo with a packed CV
- **WHEN** the scan JSON has `skipped.cv_packages: ["yasser-gombra-cv"]`
- **THEN** the fact sheet Flags line says that `yasser-gombra-cv` is a generated terminal CV and was not counted
