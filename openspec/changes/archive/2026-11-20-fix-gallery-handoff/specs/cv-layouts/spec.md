## MODIFIED Requirements

### Requirement: Gallery mode
`cvcli view <file> --gallery` SHALL open the interactive viewer with a gallery banner that shows the current layout and accent and the keys: `t` next layout, `a` next accent, Enter to choose, `q` to quit. Enter SHALL exit, restore the terminal and print three things, in this order: the choice (`Your choice: <layout> layout, <accent> accent.`), a line for users of an AI assistant that tells them to just tell the assistant the choice (`Using an AI assistant? Just tell it: "<layout>, <accent>".`), and then the matching pack command for users who type commands themselves, for example `cvcli pack CV.md --layout classic --accent violet`. `q` SHALL exit without printing a choice or a command. When stdin or stdout is not a terminal, `--gallery` SHALL print an error and exit with code 2.

#### Scenario: Choose a look
- **WHEN** the user opens the gallery, presses `t` once, `a` twice and Enter
- **THEN** the viewer exits with code 0 and prints `Your choice: classic layout, violet accent.`, then `Using an AI assistant? Just tell it: "classic, violet".`, then `cvcli pack <file> --layout classic --accent violet`

#### Scenario: Quit without a choice
- **WHEN** the user opens the gallery and presses `q`
- **THEN** the viewer exits with code 0 and prints no choice and no pack command

#### Scenario: Gallery needs a terminal
- **WHEN** the user runs `cvcli view CV.md --gallery | cat`
- **THEN** the command prints that the gallery needs an interactive terminal and exits with code 2
