# Product

## Register

product

## Users

Linux users on GNOME, KDE Plasma, and compatible X11 or Wayland desktops who regularly reuse copied text or insert expressive characters. LClip serves people in the middle of another task: they need a fast, keyboard-first picker that appears globally without interrupting their workflow.

## Product Purpose

LClip is a system-integrated clipboard history and character picker activated only by `Super + .`. It continuously monitors the text clipboard after graphical login, stores at most the 10 most recent copied text values locally, and presents clipboard history, emoji, kaomoji, GIFs, and special characters in one compact window. Choosing an item copies it and immediately pastes it into the previously focused application when the Linux session permits input injection, while the same picker remains visible and ready for another selection.

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
