# ADR-0305: The protected steward is presented as the assistant

- Status: Accepted
- Date: 2026-11-08
- Authority: Human-confirmed naming change

## Context

The built-in protected steward Bot was shown as **Tob** / **托布**. In Chinese, 托布 is also the product's own name, so a DM row, greeting or error that named 托布 could mean either the product or this Bot, and it reads like a common noun. After the settings surface became **Assistant settings** / **助理设置** (ADR-0304), a Bot still called Tob made the two names disagree. The Human asked for the Bot's name to become 助理.

## Decision

**The visible name is 助理 / Assistant.** The steward's default display name, greeting, intro letter, Marketplace review copy, private-chat hint and refusal messages call it 助理 in Chinese and “your assistant” / “Assistant” in English. The intro letter no longer explains a name made from “Bot” spelled backwards.

**One stored name, localized on display.** The Host stores the default display name `Assistant` (`TOB_DEFAULT_DISPLAY_NAME`). The Client still replaces an uncustomized steward's name with the localized `tob.defaultName`, so switching language renames it. `Tob` remains a recognized default name (`TOB_DEFAULT_DISPLAY_NAMES`) for Profiles created before this change: without a data migration, their uncustomized steward shows the localized name, while `displayNameCustomized` still protects a name the Human chose.

**The product term stays in code, not in copy.** Routes, flags, settings keys, storage keys and the glossary keep `tob`, and the glossary keeps Tob, Tob Mode and Tob Delegation as domain terms. Every user-facing surface — app copy on Web and mobile, model prompts, error messages, the user guides and the README — names the assistant 助理 / Assistant. The Tobs / 托布 product name is unchanged, as are its domain and release identities.

**The Assistant-mode sidebar header names the assistant.** The logo row's label is the localized assistant name (`tob.defaultName`) beside the assistant's mark, not the product wordmark: the row identifies the steward whose avatar and DM it opens, and the product name sat there as a second, conflicting identity.

## Consequences

- Existing Profiles adopt the new name on display without rewriting Persona Bots; a Human-chosen steward name and avatar stay exactly as chosen.
- Host JSON and the CLI still report the stored `displayName` — `Tob` for older Profiles, `Assistant` for new ones. The visible name is the localized default, so a tool that wants the Human-facing name must apply the same `tob.defaultName` rule.
- Mobile carries the same rule: a roster Bot marked `tobDefaultName` renders the localized name, so its Chats row, header, profile, settings and Activity text agree with the desktop app.
- Push notifications name the steward in the device language, so an uncustomized assistant never arrives as `Tob` in the phone's notification title.
- The guides, the README captions and the verification notes that named the steward were rewritten; historical release notes and ADRs keep the wording they shipped with.
- English copy uses “Assistant” as a name in labels and “your assistant” inside sentences, because “I'm Assistant” is not English.
- The verification entry for the protected steward now expects `Assistant` with `tob.defaultName: true`; the mobile entry point is labelled 助理模式 / Assistant mode.
