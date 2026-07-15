# LClip Visual System

## Theme

Late-night desktop utility under soft monitor light: dark neutral depth, restrained atmospheric cobalt, and translucent material that reveals context without sacrificing legibility. The interface references Apple's newest layered materials while retaining Linux-native density and behavior.

## Color

- Background: `oklch(0.08 0 0 / 0.82)`
- Material: `oklch(0.18 0.012 230 / 0.76)`
- Raised material: `oklch(0.23 0.014 230 / 0.90)`
- Ink: `oklch(0.96 0.006 230)`
- Muted ink: `oklch(0.74 0.018 230)`
- Primary cobalt: `oklch(0.75 0.08 230)`
- Accent mint: `oklch(0.86 0.12 165)`
- Danger: `oklch(0.68 0.18 28)`
- Divider: `oklch(0.92 0.012 230 / 0.12)`

## Typography

Use the Linux system UI stack: `system-ui`, Ubuntu, Cantarell, Noto Sans, and sans-serif. Use one compact scale from 12px metadata to 20px picker title. Monospace is reserved for keyboard chords and diagnostic values.

## Shape and Layout

The picker is a compact 760x560 floating utility with 14–16px structural radii and full-pill treatment only for segmented filters and status chips. A narrow tab rail anchors the left edge; search and results occupy the main surface. Content remains dense, scannable, and free of nested cards.

## Materials

Use one primary translucent window material, an opaque-enough result surface, a fine internal highlight, and a restrained background blur where supported. Never stack multiple decorative glass panels. In high-contrast or reduced-transparency environments, switch to an opaque near-black surface.

## Components

- Global search field with shortcut hint and immediate filtering
- Vertical mode rail for Clipboard, Emoji, Kaomoji, GIFs, and Symbols
- Clipboard rows with preview, source time, copy number, and destructive removal action
- Character grids with large glyph, searchable name, and category filter
- GIF masonry with explicit GIPHY attribution, loading, offline, and missing-key states
- Footer status showing capture state, item count, navigation keys, and paste capability
- Inline settings sheet for launch-at-login, history pause, shortcut status, and GIPHY key

## Motion

Use 160–220ms ease-out transitions for appearing, selection, tab changes, and dismissal. No launch sequence or decorative choreography. Reduced motion removes transforms and uses immediate opacity changes.
