# LClip Visual System

## Theme

Late-night desktop utility under soft monitor light: dark neutral depth, restrained atmospheric cobalt, and translucent material that reveals context without sacrificing legibility. The interface references Apple's newest layered materials while retaining Linux-native density and behavior.

## Color

- Background: `oklch(0.105 0.008 240 / 0.94)`
- Material: `oklch(0.18 0.014 235 / 0.90)`
- Raised material: `oklch(0.23 0.014 230 / 0.96)`
- Ink: `oklch(0.96 0.006 230)`
- Muted ink: `oklch(0.74 0.018 230)`
- Primary cobalt: `oklch(0.75 0.08 230)`
- Accent mint: `oklch(0.86 0.12 165)`
- Danger: `oklch(0.68 0.18 28)`
- Divider: `oklch(0.92 0.012 230 / 0.12)`

## Typography

Use the Linux system UI stack: `system-ui`, Ubuntu, Cantarell, Noto Sans, and sans-serif. Emoji glyphs prefer `Noto Color Emoji`. Use one compact scale from 9px metadata to 19px picker title. Monospace is reserved for keyboard chords, kaomoji, and diagnostic values.

## Shape and Layout

The picker is a compact 700x510 floating utility with 11–16px structural radii and a full-pill treatment only for the small drag indicator. A narrow tab rail anchors the left edge. A 28px clear drag strip sits above Search; bounded, independently scrolling results occupy the remaining surface. There is no persistent footer, leaving more room for results and removing information that is unnecessary during routine use.

## Materials

Use one mostly opaque translucent window material, a fine internal highlight, and restrained background blur where supported. The wallpaper may tint the material but must not compete with labels or results. Never stack multiple decorative glass panels. In high-contrast or reduced-transparency environments, switch to an opaque near-black surface.

## Components

- Global search field with shortcut hint and immediate filtering
- Full-width titlebar drag strip backed by explicit desktop-process movement, with an excluded top-right close control
- Vertical mode rail for Clipboard, Emoji, Kaomoji, GIFs, and Symbols
- Clipboard rows with preview, source time, copy number, and destructive removal action
- Character grids with large glyph, searchable name, and category filter
- Independent vertical scroll regions for every long mode and Settings
- GIF masonry with explicit GIPHY attribution, loading, offline, and missing-key states
- Inline settings sheet for launch-at-login, history pause, shortcut status, and GIPHY key

## Motion

Use 160–220ms ease-out transitions for appearing, selection, tab changes, and dismissal. No launch sequence or decorative choreography. Reduced motion removes transforms and uses immediate opacity changes.
