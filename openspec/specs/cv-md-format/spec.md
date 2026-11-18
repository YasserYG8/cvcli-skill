# cv-md-format Specification

## Purpose
TBD - created by archiving change add-terminal-cv-cli. Update Purpose after archive.
## Requirements
### Requirement: CV.md structure contract
The system SHALL treat a CV.md file as valid when it starts with a YAML-style front matter block (`---` lines) followed by a `#` title and `##` sections. The front matter key `name` is required. Known keys are `name`, `title`, `location`, `country`, `remote`, `relocation`, `status`, `email`, `phone`, `website`, `github`, `linkedin`, `language`, `updated`. Known sections, in this order, are: Summary, Experience, Projects, Open Source, Skills, Education, Languages, Interests. Any known section MAY be absent, but present sections MUST appear in this order.

#### Scenario: Valid minimal CV
- **WHEN** a CV.md has front matter with `name: Ada Dev` and a `## Summary` section
- **THEN** the parser returns a CV object with `name` "Ada Dev" and one section "summary", and no errors

#### Scenario: Missing name
- **WHEN** the front matter has no `name` key
- **THEN** validation fails with the error `Missing front matter key: name`

#### Scenario: Sections out of order
- **WHEN** `## Skills` appears before `## Projects`
- **THEN** validation fails with an error naming both sections and the expected order

#### Scenario: Unknown section
- **WHEN** the file contains `## Hobbies`
- **THEN** validation reports a warning `Unknown section: Hobbies` and keeps the section's text as-is

### Requirement: French section names
The parser SHALL accept the French section names (Résumé, Expériences, Projets, Open Source, Compétences, Formation, Langues, Centres d'intérêt) as aliases of the English ones, and SHALL keep the original heading text for display.

#### Scenario: French CV
- **WHEN** a CV.md has `language: fr` and the sections `## Résumé` and `## Projets`
- **THEN** the parser maps them to "summary" and "projects" and stores the display titles "Résumé" and "Projets"

### Requirement: Entry parsing
Inside Experience, Projects, Open Source and Education, the parser SHALL read each `###` heading as one entry with: a title (text before ` — `), a subtitle (text after ` — `), a meta line (the first plain line after the heading, split on ` · `), an optional `Tech:` line, and a list of `- ` bullets. Inside Skills, it SHALL read `- **Group:** a, b, c` lines as skill groups. Inside Languages, it SHALL read `- Name: level` lines.

#### Scenario: Project entry
- **WHEN** a Projects section contains `### Specter — live log streamer`, the line `Solo project · Oct 2026 – Nov 2026 · https://github.com/u/specter`, `Tech: Go, eBPF` and two bullets
- **THEN** the entry has title "Specter", subtitle "live log streamer", meta ["Solo project", "Oct 2026 – Nov 2026", "https://github.com/u/specter"], tech ["Go", "eBPF"] and 2 bullets

#### Scenario: Skill groups
- **WHEN** Skills contains `- **Languages:** Go, Python`
- **THEN** the parser returns a group "Languages" with items ["Go", "Python"]

### Requirement: Check command
`cvcli check <file>` SHALL print every error and warning with its line number, exit with code 0 when there are no errors (warnings allowed) and exit with code 1 when there is at least one error. A missing or unreadable file SHALL exit with code 2.

#### Scenario: File with an error
- **WHEN** the user runs `cvcli check CV.md` on a file without `name`
- **THEN** the output contains `CV.md:1: Missing front matter key: name` and the exit code is 1

#### Scenario: Missing file
- **WHEN** the user runs `cvcli check nope.md`
- **THEN** the output says the file was not found and the exit code is 2

### Requirement: Placeholders are reported
The validator SHALL report every placeholder of the form `[word?]` (for example `[metric?]`, `[city?]`) as a warning with its line number, so the user can fill it before sharing.

#### Scenario: Placeholder warning
- **WHEN** line 24 of CV.md contains `[city?]`
- **THEN** `cvcli check` prints the warning `CV.md:24: Placeholder to fill: [city?]` and still exits with code 0

