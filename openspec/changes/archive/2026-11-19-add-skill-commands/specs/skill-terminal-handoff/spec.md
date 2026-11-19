## MODIFIED Requirements

### Requirement: Offer a terminal CV after the full CV
After saving CV.md in the Full CV workflow, the skill SHALL offer the next step in plain words: choosing the look of the terminal CV (`/cvcli style`) or sharing it (`/cvcli share`), with "nothing for now" as a valid answer. It SHALL NOT run any `cvcli` command without a yes. The terminal CV steps SHALL run from the share workflow, not inline in the Full CV workflow.

#### Scenario: User says yes
- **WHEN** the user accepts sharing the CV
- **THEN** the skill runs the share workflow: the bundled CLI (`node ${CLAUDE_SKILL_DIR}/cli/bin/cvcli.js`) with `check <CV.md>`, then `pack <CV.md>`, then the local test `npx ./<folder> --print`, and reports the result in plain words

#### Scenario: User wants to choose the look first
- **WHEN** the user answers that they want to choose the look
- **THEN** the skill runs the style workflow, and then offers to share

#### Scenario: Node.js missing
- **WHEN** `node --version` fails or reports a version below 18
- **THEN** the skill tells the user that the terminal CV needs Node.js 18+, and keeps CV.md as the result

#### Scenario: User says no
- **WHEN** the user declines
- **THEN** the skill ends the workflow without running any cvcli command
