## ADDED Requirements

### Requirement: Layout registry
The viewer SHALL provide exactly these layouts in this order: `sidebar`, `classic`, `manpage`. The default layout SHALL be `sidebar`. All layouts SHALL show the same CV content (every present section and the contact block), and SHALL only change how it is arranged and styled.

#### Scenario: Default layout
- **WHEN** the CV has no `display.layout` and no `--layout` flag is given
- **THEN** the interactive viewer uses the `sidebar` layout

#### Scenario: Same content in every layout
- **WHEN** the sample CV is rendered in each layout at 100 columns
- **THEN** every section title and every entry title of the sample CV appears in each layout's output

### Requirement: Sidebar layout
The `sidebar` layout SHALL draw a framed card, centered horizontally, at most 100 columns wide and as tall as the terminal. The card SHALL have a header area (name, title, location line and status badge), a vertical list of sections with their shortcut letters on the left, the selected section on the right with its title, and a footer line with the key hints and the position (`3/9`). The selected section SHALL be marked with a symbol (for example `▌`) and bold text, not with color alone.

#### Scenario: All sections fit without wrapping
- **WHEN** the sample CV (9 sections with contact) is shown in a 100×30 terminal
- **THEN** each section name is on its own line in the left list and no section name is cut or wrapped

#### Scenario: Centered card on a wide terminal
- **WHEN** the terminal is 160 columns wide
- **THEN** the card is 100 columns wide and the empty space on the left and right differs by at most one column

### Requirement: Classic layout
The `classic` layout SHALL show the CV as one page that scrolls, with two columns: a narrow left column for the name, title, status, contact, skills and languages, and a wide right column for the summary, experience, projects, open source, education and interests. Section shortcut letters SHALL scroll the page to that section's heading.

#### Scenario: Two columns
- **WHEN** the sample CV is shown in the `classic` layout at 100 columns
- **THEN** the line with the `EXPERIENCE` heading also contains text from the left column or the column border

#### Scenario: Jump to a heading
- **WHEN** the user presses `p` in the `classic` layout
- **THEN** the page scrolls so the `PROJECTS` heading is the first body line, or as close to it as the page length allows

### Requirement: Man page layout
The `manpage` layout SHALL show the CV as one scrolled page in the style of a Unix manual page: a top line `<NAME>(1)` on both sides with a centered middle title, then the headings `NAME` (name and title), `DESCRIPTION` (the summary) and then one uppercase heading per other section, with section bodies indented. A `SYNOPSIS` heading with `npx <package-name>` SHALL be shown only when the package name is known (packaged viewer), never with an invented name. Section shortcut letters SHALL scroll to the heading.

#### Scenario: Man page headings
- **WHEN** the sample CV is shown in the `manpage` layout
- **THEN** the output contains the headings `NAME`, `DESCRIPTION` and `EXPERIENCE`, in this order

#### Scenario: No invented package name
- **WHEN** the `manpage` layout runs from `cvcli view CV.md` (no package)
- **THEN** there is no `SYNOPSIS` heading

### Requirement: Narrow fallbacks
Each layout SHALL stay readable on small terminals. Below 72 columns, `sidebar` SHALL replace the left list with a one-line section indicator (for example `‹ Projects 3/9 ›`). Below 90 columns, `classic` SHALL stack its two columns into one column (left column content first). Below 60 columns or 16 rows, all layouts SHALL drop the outer frame. In every case, no rendered line SHALL be wider than the terminal.

#### Scenario: Every layout fits at many sizes
- **WHEN** each layout renders every section of the sample CV at 40×12, 60×24, 80×24, 100×30 and 160×50
- **THEN** no line is wider than the terminal width (measured without escape codes) and the number of lines equals the terminal height

#### Scenario: Classic stacks on a medium terminal
- **WHEN** the `classic` layout is shown at 80 columns
- **THEN** it shows one column, with the contact block before the experience section

### Requirement: Display settings in cv.json
`cv.json` MAY contain an optional `display` object `{ "layout": <name>, "accent": <color> }`. The viewer SHALL use it as the starting look. An unknown or missing value SHALL fall back to the default (`sidebar`, `teal`) without an error, so an old or edited `cv.json` still opens. The format number SHALL stay `1`.

#### Scenario: Owner's choice is used
- **WHEN** `cv.json` has `"display": { "layout": "manpage", "accent": "amber" }`
- **THEN** the viewer starts in the `manpage` layout with the amber accent

#### Scenario: Unknown layout in cv.json
- **WHEN** `cv.json` has `"display": { "layout": "fancy" }`
- **THEN** the viewer starts in the `sidebar` layout and does not print an error

### Requirement: Viewer layout switch
In interactive mode, the `t` key SHALL switch to the next layout in registry order, wrapping around after the last. The switch SHALL keep the current section when possible and SHALL NOT change `cv.json` or any file. The footer SHALL show the current layout name and the `t` hint.

#### Scenario: Cycle layouts
- **WHEN** the viewer starts in `sidebar` and the user presses `t` three times
- **THEN** it shows `classic`, then `manpage`, then `sidebar` again, and no file is changed

### Requirement: Gallery mode
`cvcli view <file> --gallery` SHALL open the interactive viewer with a gallery banner that shows the current layout and accent and the keys: `t` next layout, `a` next accent, Enter to choose, `q` to quit. Enter SHALL exit, restore the terminal and print the matching command, for example `cvcli pack CV.md --layout classic --accent violet`. `q` SHALL exit without printing a command. When stdin or stdout is not a terminal, `--gallery` SHALL print an error and exit with code 2.

#### Scenario: Choose a look
- **WHEN** the user opens the gallery, presses `t` once, `a` twice and Enter
- **THEN** the viewer exits with code 0 and prints `cvcli pack <file> --layout classic --accent violet`

#### Scenario: Gallery needs a terminal
- **WHEN** the user runs `cvcli view CV.md --gallery | cat`
- **THEN** the command prints that the gallery needs an interactive terminal and exits with code 2
