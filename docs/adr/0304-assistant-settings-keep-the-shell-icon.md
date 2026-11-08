---
Status: Accepted
Date: 2026-11-08
---

# Assistant settings keep the shell's settings icon

## Context

ADR-0057 tagged the DSH Settings navigation cell for the BotHarness section by its localized label and replaced the shell's settings gear with the Human's chosen Bot mark. The row then read as an identity badge among uniform settings glyphs: a large piece of artwork next to Models, Plugins and Agent presets. The Human asked for the row to be called **助理设置 / Assistant settings** and to keep an ordinary, consistent settings icon instead of the mark.

## Decision

- **The shell icon stays.** The client no longer tags or rewrites the DSH Settings navigation: `bot-icon-nav.ts` and its observer are deleted, and the shell's own settings glyph identifies the section. BotHarness does not patch shell navigation for artwork.
- **The surface is Assistant settings.** `settings.nav` and `panel.settings` read "Assistant settings" / "助理设置" in both locales. This covers the DSH Settings item, the Bot mode sidebar row, the workspace control-rail control, the mobile navigation label and the settings dialog title. UI copy, guides and `GLOSSARY.md` use the same name.
- **The Bot mark keeps its own surfaces.** ADR-0057's asset pipeline and `botIcon` preference still drive the Bot mode sidebar logo, PersonaBot avatars, session folders and other application-owned surfaces. Only the shell-owned Settings navigation stops wearing the mark.

## Consequences

- The Settings navigation matches DSH's other rows and no longer depends on the shell's nav DOM shape. The workaround, its MutationObserver, the matching tests and the CSS that hid the shell glyph are deleted.
- A Human who chose a custom Bot mark no longer sees it in the DSH Settings navigation. That is deliberate: the destination icon names a settings surface, not an identity.
- The label is user-visible in both languages, so UI copy, tests, the glossary and the user-facing settings, pairing, model and update guides carry the new name.
