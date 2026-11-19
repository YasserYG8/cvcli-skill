## ADDED Requirements

### Requirement: Six commands
The skill SHALL offer six commands as one skill with an optional word after its name: `/cvcli`, `/cvcli cv`, `/cvcli project`, `/cvcli post`, `/cvcli style` and `/cvcli share`. The first word of the invocation arguments SHALL pick the workflow, ignoring case: `cv` → full CV workflow, `project` → project workflow with CV bullets and a portfolio card, `post` → project workflow with social posts, `style` → choose the terminal CV look, `share` → make and share the terminal CV package. The rest of the arguments SHALL be used as the user's request (for example `/cvcli post linkedin, in French`).

#### Scenario: Command with a word
- **WHEN** the user runs `/cvcli project ~/code/shop-api`
- **THEN** the skill runs the project workflow on `~/code/shop-api` and does not show the start menu

#### Scenario: Unknown word
- **WHEN** the user runs `/cvcli resume please`
- **THEN** the skill treats the words as a plain request ("resume please" → full CV workflow) and does not fail because the word is not a command

### Requirement: Start menu
When the skill is invoked without a command word and the request does not make clear what the user wants, the skill SHALL ask one question in one message that lists the five other commands in plain words, each with a short example of what the user gets. The user SHALL be able to answer with the command, a number, or in their own words.

#### Scenario: Bare command
- **WHEN** the user runs `/cvcli` with nothing else
- **THEN** the skill shows the five choices (make or update a CV, CV lines for a project, a post about a project, the look of the terminal CV, share the CV) in one message and waits for the answer

#### Scenario: Clear plain request
- **WHEN** the user writes "Write a LinkedIn post about this repo" without any command
- **THEN** the skill runs the post workflow directly, without the start menu

### Requirement: Project and post defaults
`/cvcli project` SHALL produce CV bullets and a portfolio card unless the user asks for other outputs. `/cvcli post` SHALL ask which platform (LinkedIn, X or both) with "both" as the default, unless the user already named one. Both SHALL scan the current project folder unless the user gives another path or a GitHub URL.

#### Scenario: Post without a platform
- **WHEN** the user runs `/cvcli post` and answers "you choose" to the platform question
- **THEN** the skill writes a LinkedIn post and an X post

### Requirement: Results, not commands
The skill SHALL talk to the user about results, not about commands, flags or file internals. It SHALL show a shell command only when the user asks for it, or when the user must run it themselves (the interactive terminal viewer, which needs a real separate terminal window because the agent's shell is not interactive). The skill SHALL run every other command itself.

#### Scenario: Packing the CV
- **WHEN** the skill packs the terminal CV during `/cvcli share`
- **THEN** it reports the result in plain words (what was made, where, and that the test worked) and does not ask the user to run `pack` or show its flags

#### Scenario: User asks for the command
- **WHEN** the user asks "what command did you run?"
- **THEN** the skill shows the exact command

### Requirement: Every question has a default
Every question the skill asks SHALL say what happens by default. The answers "skip", "I don't know" and "you choose" SHALL always be accepted: the skill then uses the default, or keeps a visible placeholder for a missing fact, and explains its choice in one line. The honesty rules SHALL still apply: a default never invents a fact.

#### Scenario: User does not know
- **WHEN** the skill asks which look the user wants and the user says "I don't know"
- **THEN** the skill picks the default look and says in one line why it fits

#### Scenario: Unknown fact
- **WHEN** the skill asks for a project's number of users and the user says "skip"
- **THEN** the CV keeps the `[metric?]` placeholder and the skill does not guess a number

### Requirement: Style command with presets
`/cvcli style` SHALL let the user describe the look of their terminal CV in their own words ("calm", "bold", "like an old hacker screen", "you choose") and SHALL map the description to one of the existing layouts (`sidebar`, `classic`, `manpage`) and accents (`teal`, `blue`, `violet`, `green`, `amber`), explaining the pick in one line. It MAY offer the interactive gallery as an optional extra, and then SHALL say that it must be run in a separate terminal window. When a package made by cvcli already exists, the skill SHALL save the chosen look into it; otherwise it SHALL offer to continue with `/cvcli share` using the chosen look.

#### Scenario: Words mapped to a look
- **WHEN** the user runs `/cvcli style` and says "serious, like a paper CV, in blue"
- **THEN** the skill picks layout `classic` and accent `blue` and explains the pick in one line

#### Scenario: Package already exists
- **WHEN** a cvcli package folder for this CV.md exists and the user chooses a new look
- **THEN** the skill updates that package with the new look, keeping its version and README, and confirms in plain words

#### Scenario: No package yet
- **WHEN** no cvcli package exists for this CV.md
- **THEN** the skill keeps the chosen look and offers to share the CV now with it

### Requirement: Share command
`/cvcli share` SHALL make the terminal CV package and test it, following the steps of the terminal handoff (Node.js check, CV check, placeholders, contact choice, GitHub repo or "later", pack, local test, next steps). Before packing, it SHALL make sure the package folder cannot be committed to a public repository by mistake: when the target folder is inside a git repository and not ignored by git, the skill SHALL offer to put the folder outside the repository or to add it to `.gitignore` (default: add it to `.gitignore`). It SHALL never run `git push` or `npm publish` without the user's explicit yes.

#### Scenario: Folder inside a repo
- **WHEN** the user runs `/cvcli share` inside a git repository and the package folder would not be ignored
- **THEN** the skill offers to add the folder to `.gitignore` or to use a folder outside the repository, before packing

#### Scenario: No automatic publish
- **WHEN** the local test succeeds
- **THEN** the skill explains the next steps in plain words and does not push or publish anything
