# ADR-0306: A host that owns the control rail suppresses the in-surface rail

- Status: Accepted
- Date: 2026-11-08

## Context

The Bot-mode workspace draws its own control rail: a 56 px column with the brand mark, the panel launcher, mobile apps, diagnostics, settings, device requests, the exit command and the rail's drag handle. It is the standalone app's primary chrome.

An embedding host can already provide a mode rail of its own — BirdCoder renders the app-mode switcher in the frame's first column and mounts the assistant surface in the middle. There the in-surface rail duplicates chrome, costs 56 px, and pushes the channel list into a strip the Human called unusable. The Human asked for the plugin's rail to disappear entirely in that host.

## Decision

**A host declares that it owns the rail.** Setting `data-bh-host-rail` on `<html>` (before the surface mounts) tells the workspace that the host supplies the control column.

**The workspace then omits its rail completely.** With the attribute present the workspace does not create the rail panel, closes one that a saved layout restored, and gives a channel column narrower than 200 px the rail's space (260 px). The channel list becomes the surface's leftmost panel.

**The standalone app is unchanged.** It does not set the attribute, so its rail stays the launcher for panels, settings, devices and exit.

## Consequences

- The host keeps exactly one control column. The channel list, not an icon strip, is the surface's left edge in an embedding host.
- The rail's own entries do not render in that host: settings stay reachable through DSH Settings (助理设置), panel switching through the dock's sub-panel toggle and Panels menu, and exit/navigation through the host's own chrome.
- A profile whose saved layout predates the attribute is normalized on the next mount: the rail panel is closed and the wider channel column is saved with the rest of the layout.
- `packages/client/test/channel-dock.test.tsx` covers both the host case (no rail panel, channel list present) and the standalone case (rail unchanged).
