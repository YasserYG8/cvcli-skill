## ADDED Requirements

### Requirement: View command
`cvcli view <file>` SHALL parse the CV.md, refuse to render if validation has errors (printing them and exiting with code 1), and otherwise render the CV in the terminal.

#### Scenario: Valid file
- **WHEN** the user runs `cvcli view CV.md` on a valid file in an interactive terminal
- **THEN** the viewer shows the header (name, title, location, status) and the first section

#### Scenario: Invalid file
- **WHEN** the file has validation errors
- **THEN** the viewer prints the same errors as `cvcli check` and exits with code 1

### Requirement: Interactive navigation
In an interactive terminal (stdout is a TTY and stdin is a TTY), the viewer SHALL show a menu of the present sections, each with a one-letter shortcut, and SHALL support: the shortcut keys to open a section, left/right arrows to move between sections, up/down arrows and PageUp/PageDown to scroll, and `q`, Esc or Ctrl+C to quit and restore the terminal.

#### Scenario: Open a section by key
- **WHEN** the viewer is open and the user presses `p`
- **THEN** the Projects section is shown

#### Scenario: Quit restores the terminal
- **WHEN** the user presses `q`
- **THEN** the viewer exits with code 0, the cursor is visible again and raw mode is off

### Requirement: Non-interactive output
When stdout is not a TTY, or with the `--print` flag, the viewer SHALL print the whole CV once as plain text (no colors, no escape codes, no key handling) and exit with code 0. The `NO_COLOR` environment variable SHALL disable colors in interactive mode too.

#### Scenario: Piped output
- **WHEN** the user runs `cvcli view CV.md | cat`
- **THEN** the full CV is printed with no ANSI escape codes and the process exits with code 0

#### Scenario: NO_COLOR
- **WHEN** `NO_COLOR=1` is set
- **THEN** the interactive viewer uses no color codes

### Requirement: Layout adapts to terminal width
The viewer SHALL wrap text to the terminal width (default 80 columns when unknown), with a maximum line width of 100 columns, and SHALL re-render when the terminal is resized.

#### Scenario: Narrow terminal
- **WHEN** the terminal is 60 columns wide
- **THEN** no rendered line is longer than 60 columns

### Requirement: Zero dependencies and portability
The viewer SHALL use only Node.js built-in modules, SHALL run on Node.js 18 or newer on Linux, macOS and Windows terminals, and SHALL be a single plain JavaScript file that can be copied into a generated package.

#### Scenario: No node_modules
- **WHEN** the viewer file is copied into an empty folder with only a cv.json next to it
- **THEN** `node cli.js --print` prints the CV without installing anything
