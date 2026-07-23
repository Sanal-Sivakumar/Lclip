# Product

## Register

product

## Users

Linux users on GNOME, KDE Plasma, and compatible X11 or Wayland desktops who regularly reuse copied text or insert expressive characters. LClip serves people in the middle of another task: they need a fast, keyboard-first picker that appears globally without interrupting their workflow.

## Product Purpose

LClip is a system-integrated clipboard history and character picker activated only by `Super + .`. It continuously monitors the text clipboard after graphical login, stores at most the 10 most recent copied text values locally, and presents clipboard history, emoji, kaomoji, GIFs, and special characters in one compact window. Choosing an item copies it, briefly yields the picker so the previous application can regain focus, immediately pastes when the Linux session permits input injection, and reopens the existing picker for another selection.

## Brand Personality

Quiet, precise, and tactile. LClip should feel like a considered part of the operating system: fast enough to disappear into muscle memory, polished enough to feel premium, and candid whenever a desktop security boundary limits automatic paste.

## Anti-references

No dashboard shell, oversized marketing UI, neon gamer styling, decorative glass-card grids, persistent key logging, fake security claims, or Windows clipboard-manager imitation. Transparency must communicate hierarchy and context rather than becoming decoration.

## Design Principles

- Keep the user's current task in context; open quickly, paste quickly, and get out of the way.
- Register one explicit global chord instead of recording arbitrary keystrokes.
- Keep clipboard history local, bounded to 10 text entries, and easy to clear or pause.
- Support repeated selections without forcing the user to reopen the picker after every item.
- Make keyboard navigation and pointer interaction equally complete.
- Keep routine chrome minimal; diagnostics belong in Settings rather than a persistent footer.
- Treat GNOME, KDE, X11, and Wayland capability differences honestly and degrade gracefully.
- Keep every distributed LClip version free and open source through GPLv3 copyleft.

## Accessibility & Inclusion

Target WCAG 2.2 AA, complete keyboard navigation, visible focus, 44px minimum primary targets, readable contrast over translucent surfaces, screen-reader labels, reduced-motion behavior, and redundant color-plus-text status communication.

## Stable distribution promise

LClip 1.0 is distributed for current 64-bit glibc Linux systems on x86-64 and ARM64. The default no-root installer uses a checksum-verified portable archive and creates only per-user files; AppImage, Debian, and RPM formats remain available for users who prefer them. Core selection never depends on synthetic input succeeding: LClip copies the chosen value first, attempts the available bridge, and clearly requests manual `Ctrl+V` when desktop policy blocks automation. Platform-specific enhancements may vary, but failure must remain visible and data-preserving.
