## ADDED Requirements

### Requirement: Offer a terminal CV after the full CV
After saving CV.md in the Full CV workflow, the skill SHALL ask the user whether they want a terminal version of their CV. It SHALL NOT run any `cvcli` command without a yes.

#### Scenario: User says yes
- **WHEN** the user accepts the offer
- **THEN** the skill runs the bundled CLI (`node ${CLAUDE_SKILL_DIR}/cli/bin/cvcli.js`) with `check <CV.md>`, then `pack <CV.md>`, then the local test `npx ./<folder> --print`, and shows the output

#### Scenario: Node.js missing
- **WHEN** `node --version` fails or reports a version below 18
- **THEN** the skill tells the user that the terminal CV needs Node.js 18+, and keeps CV.md as the result

#### Scenario: User says no
- **WHEN** the user declines
- **THEN** the skill ends the workflow without running any cvcli command

### Requirement: Fix check errors before packing
If `cvcli check` reports errors, the skill SHALL fix the CV.md (keeping the honesty rules) and run the check again before packing. It SHALL list remaining placeholder warnings and ask whether to fill them first.

#### Scenario: Placeholder left
- **WHEN** the check shows `Placeholder to fill: [city?]`
- **THEN** the skill asks the user for the city before packing, or packs only if the user says "skip"

### Requirement: Contact choice is the user's
The skill SHALL ask the user which contact fields to include in the package and SHALL pass `--include-phone` only if the user explicitly agrees to publish the phone number.

#### Scenario: Phone not confirmed
- **WHEN** the user has not said yes to showing the phone in the package
- **THEN** the skill runs pack without `--include-phone`

### Requirement: Next steps
After a successful local test, the skill SHALL tell the user the next sharing steps (GitHub level and npm level) and point to the generated `PUBLISHING.md`, without pushing or publishing anything itself unless the user asks.

#### Scenario: No automatic publish
- **WHEN** the local test succeeds
- **THEN** the skill shows the next steps and does not run `git push` or `npm publish`
