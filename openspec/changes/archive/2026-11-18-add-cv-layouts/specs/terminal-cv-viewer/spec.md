## MODIFIED Requirements

### Requirement: View command
`cvcli view <file>` SHALL parse the CV.md, refuse to render if validation has errors (printing them and exiting with code 1), and otherwise render the CV in the terminal. It SHALL accept `--layout <name>` and `--accent <color>` to preview a look, and `--gallery` to open the gallery mode. An unknown `--layout` or `--accent` value SHALL be refused with exit code 2 and the list of valid values.

#### Scenario: Valid file
- **WHEN** the user runs `cvcli view CV.md` on a valid file in an interactive terminal
- **THEN** the viewer shows the header (name, title, location, status) and the first section

#### Scenario: Invalid file
- **WHEN** the file has validation errors
- **THEN** the viewer prints the same errors as `cvcli check` and exits with code 1

#### Scenario: Preview a layout
- **WHEN** the user runs `cvcli view CV.md --layout manpage --accent green`
- **THEN** the interactive viewer starts in the `manpage` layout with the green accent

#### Scenario: Unknown layout flag
- **WHEN** the user runs `cvcli view CV.md --layout fancy`
- **THEN** the command exits with code 2 and prints `sidebar, classic, manpage`

### Requirement: Interactive navigation
In an interactive terminal (stdout is a TTY and stdin is a TTY), the viewer SHALL give each present section a one-letter shortcut (the letters `q`, `t` and `a` are reserved and never used as shortcuts) and SHALL support: `q`, Esc or Ctrl+C to quit and restore the terminal, and `t` to switch layout. Navigation SHALL depend on the layout type:
- **Paged layouts** (`sidebar`) show one section at a time: the shortcut keys open a section, and up/down arrows follow the vertical section list. Down scrolls the section when there is more below, and otherwise opens the next section (it stops at the last one). Up scrolls back, and at the top of a section it opens the previous one (it stops at the first one). Left/right arrows (and Tab) also move between sections, and PageUp/PageDown and Space scroll inside the section.
- **Page layouts** (`classic`, `manpage`) show the whole CV as one page: the shortcut keys and left/right arrows jump to a section heading, and up/down arrows, PageUp/PageDown, Space, Home and End scroll the page.

#### Scenario: Open a section by key
- **WHEN** the viewer is open in the `sidebar` layout and the user presses `p`
- **THEN** the Projects section is shown

#### Scenario: Up and down move through the section list
- **WHEN** the viewer is open in the `sidebar` layout on Summary, the section fits on the screen, and the user presses the down arrow
- **THEN** the Experience section is shown; pressing the up arrow shows Summary again

#### Scenario: Down scrolls a long section first
- **WHEN** the Projects section is longer than the screen and the user presses the down arrow
- **THEN** the section scrolls by one line, and only after its last line is visible does the down arrow open the next section

#### Scenario: Jump to a heading by key
- **WHEN** the viewer is open in the `manpage` layout and the user presses `p`
- **THEN** the page scrolls to the `PROJECTS` heading

#### Scenario: Reserved letters
- **WHEN** a section title starts with `T` (for example "Talks")
- **THEN** its shortcut is another letter of its title, and `t` still switches the layout

#### Scenario: Quit restores the terminal
- **WHEN** the user presses `q`
- **THEN** the viewer exits with code 0, the cursor is visible again and raw mode is off
