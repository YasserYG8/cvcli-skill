## ADDED Requirements

### Requirement: Color roles
The viewer SHALL style text only through these roles: `accent` (name, selected section marker, section headings), `text` (normal text), `strong` (entry titles, labels), `muted` (dates, locations, key hints), `border` (frame and rules) and `success` (the status badge). Layouts and components SHALL NOT use raw color codes directly.

#### Scenario: One accent per screen
- **WHEN** a frame is rendered with the `blue` accent at 256 colors
- **THEN** every foreground color code in the frame belongs to one of the role colors of the `blue` theme

### Requirement: Accent list
The owner SHALL be able to choose one accent from: `teal` (default), `blue`, `violet`, `green`, `amber`. The other roles SHALL be neutral grays and the terminal's default foreground, the same for every accent. Accents SHALL keep readable contrast on both dark and light terminal backgrounds.

#### Scenario: Default accent
- **WHEN** no accent is chosen
- **THEN** the viewer uses `teal`

#### Scenario: Accent changes only the accent role
- **WHEN** the same frame is rendered with `teal` and with `amber`
- **THEN** only the color codes of the `accent` role differ between the two frames

### Requirement: Color depth adaptation
The viewer SHALL detect the terminal color depth with Node's built-in `tty` support (`stream.getColorDepth()`) and SHALL use truecolor (24-bit), 256-color or 16-color codes to match. In 16-color mode, each accent SHALL map to a basic ANSI color (teal→cyan, blue→blue, violet→magenta, green→green, amber→yellow) and `muted` SHALL use bright black, not the faint (`2`) attribute.

#### Scenario: 16-color terminal
- **WHEN** the color depth is 4 bits and the accent is `teal`
- **THEN** the accent uses the ANSI cyan code (`36` or `96`) and no 256-color or truecolor codes appear

#### Scenario: Truecolor terminal
- **WHEN** the color depth is 24 bits
- **THEN** the accent is written as a `38;2;r;g;b` code

### Requirement: Design works without color
With `NO_COLOR` set or a color depth of 1 bit, the viewer SHALL output no color codes, and every layout SHALL still show which section is selected, which text is a heading and where the status badge is, by using symbols, bold, uppercase and spacing.

#### Scenario: NO_COLOR keeps the selection visible
- **WHEN** `NO_COLOR=1` is set and the `sidebar` layout shows the Projects section
- **THEN** the frame contains no color codes and the Projects line in the left list starts with the selection marker
