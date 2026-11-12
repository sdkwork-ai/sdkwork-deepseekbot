# ADR-0309: Window Companions are opt-in

Status: Accepted

Date: 2026-11-12

## Context

[ADR-0144](0144-window-companions-consume-owned-activity-and-scoped-output.md) defines how a selected Window Companion consumes Activity and scoped Bot output. Its per-companion switches default to Activity on, DM on and groups off.

Separately, the Client quietly selected the default Assistant as a companion the first time a Profile completed onboarding: `WindowCompanions.initializeDefault` wrote a `botharness/companions/default-initialized/<profile>` marker and added the Assistant with the default selection if the Profile had never saved one. On a new Profile this put a floating character and its rail above the composer before the Human had asked for one. The Human decided the product should not show Window Companions by default.

## Decision

- Do not auto-select any Window Companion. `initializeDefault` is removed, and onboarding no longer calls it. A companion appears only after the Human selects one in Assistant settings → Window companions.
- Keep the saved-selection behaviour unchanged: an existing saved selection still loads; removing the last companion is still remembered.
- Migrate the old bootstrap once: if the old `default-initialized` marker exists and the stored selection is exactly one companion matching the auto-created defaults (Activity, DM, shared visibility, walking, position 0.75), drop that selection on start. A selection the Human moved or changed is preserved.
- ADR-0144's per-companion switches and visibility defaults still apply once a companion exists.

## Consequences

- New Profiles show no companion, companion sound or companion rail until the Human opts in.
- Existing Profiles that never touched the auto-created companion lose it after the next Client load; Profiles with a modified or additional selection keep theirs.
- The companion feature, its Activity/DM/group switches and its removal path are unchanged; only the implicit first-run selection is gone.
