# Assistant mode entry and the protected Assistant

Assistant mode swaps the native DSH session view for the BotHarness conversation view. On structurally qualified Web/macOS/Windows windows at least 961px wide it opens the [workspace](bot-mode-dock.md); other shells retain the original Assistant mode sidebar fallback (ADR-0203). On the first entry into a fresh Profile, the product prepares protected Assistant; its DM is a Channel list row. See [the protected Assistant DM](tob-home.md) for the current first-run journey. Existing ordinary DeepSeek Bots and their welcome letters remain unchanged.

## Sub-features

- `enter` switches from the native view to Assistant mode.
- `sidebar` is the desktop Assistant mode sidebar: a `DeepSeekBot` header, the Messages Roster and Steward settings, in the column DSH sizes and collapses. Dock panels are not switched here: the Dock's right-side column shows them as icon tabs, and its Panels menu opens the ones that are closed. Before a Channel is open the Dock, its tabs and its Panels menu are unavailable, so the sidebar keeps its Activity entry (unread count and needs-action hint) until the Dock attaches; that entry opens the full Activity Center page.
- `bottom-return` adds a permanent **Back to Harness / 返回 Harness** icon directly below Steward settings in the qualified wide workspace Control Rail, using the same exit operation as the top logo. It remains visible without hover or tutorial completion.
- `exit` leaves Assistant mode with the header logo, which morphs into **Exit Assistant mode** on hover or keyboard focus, and brings back the native left column.
- `default-bot` prepares Assistant and opens its DM whenever Assistant mode opens with no selected Channel, so the empty welcome state is not shown while Assistant exists.
- `companion` is opt-in: a new Profile shows no Window Companion until one is selected in Assistant settings → Window companions. An old auto-created default is removed on the next Client load ([ADR-0309](../../../../docs/adr/0309-window-companions-are-opt-in.md)).
- `welcome-letter` preserves the older DeepSeek Bot welcome; fresh Assistant uses a once-only fixed greeting.
- `getting-started` opens the tutorial checklist.

## How to get to it (user POV)

- Choose `Assistant mode` in the global sidebar.
- On desktop, choose the logo at the top left of the Assistant mode sidebar (its accessible name is `Exit Assistant mode`) to return to the native view. At 960px or narrower (also at up to 1000px wide and 500px high), use the mobile single-column layout and its explicit exit button; the native sidebar is hidden.

The workspace rail carries the exit control and panel switches; the independent Channel list carries the Roster. Both remain available without a selected Channel.

## Driving it with verify-app

Preconditions: a fresh instance that passes `doctor`. For the qualified workspace run `scripts/e2e-panel-workspace.mjs` as described in [the workspace feature](bot-mode-dock.md); the old sidebar journey below applies to fallback shells only.

- **Enter.** Run `node scripts/verify-app.mjs shot bot-mode --name <n> --bot-mode`. The ARIA file has `StaticText "Messages"` and `button "Steward settings"`.
- **Default Bot.** Run the same command a second time. The ARIA file has the assistant row in the Channel list and the Assistant DM already open (`Message Assistant`) without selecting a row; clearing the selection and re-entering Assistant mode reopens it.
- **Canonical state.** Run `node scripts/verify-app.mjs rpc botharness/list --name <n>`. `bots` holds one entry with `displayName` `Assistant` and `tob.defaultName: true`.
- **Observation.** Keep the page open and run `node scripts/verify-app.mjs observe --name <n>` before entering Assistant mode, inside it and after exiting. A healthy transition keeps `client.state` at `shell-ready`; a visible Assistant mode main surface replaces the native sidebar marker. Inspect the DOM and any first failure separately.
- **Sidebar and exit.** Run `BH_E2E_INSTANCE=.humanlayer/verify/<n>/instance.json node scripts/e2e-bot-mode-sidebar.mjs`. It checks that the Assistant mode sidebar fills the column with no native `Assistant mode` row, selects a Roster row, opens and closes the Activity Center panel from the Dock Panels menu (`[data-dock-menu]`, item `activity-center`) and checks its `[data-tab-panel-id="activity-center"]` tab, collapses and reopens the rail, then exits and checks that `New Session`, `Plugins` and `Settings` are back. It waits for the Channel content, checks `shell-ready` before entry, inside Assistant mode, with Activity Center open, with the rail collapsed and after exit, and saves `client-observations.json` beside the screenshots. It prints `BOT MODE SIDEBAR PASS`. Each invocation writes a distinct `attempt-<time>-<pid>/` evidence directory so retries retain earlier results. Failed runs preserve `failure.png`, `failure-aria.json`, `page-errors.json` and `failure-observation.json` (the failing step and bounded diagnostic snapshot) before closing the browser.
- **Exit by hand.** Run `node scripts/verify-app.mjs shot exit --name <n> --bot-mode --click "Exit Assistant mode" --wait "Plugins"`. The ARIA file has `button "Assistant mode"` and `button "Plugins"` again.
- **Tutorial.** Add `--keep-overlays`. The screenshot shows the `Get started with DeepSeekBot` checklist.

## Gotchas

- On macOS, Chrome can keep the OS language despite `--lang=en-US`; this journey uses a CDP language override so its English accessible-name assertions are deterministic. A selector timeout with a healthy shell needs the saved ARIA tree before diagnosis.

- `shot` waits for a `Settings` button with visible text, so it cannot start below 1024 px, where DSH shows the rail. Drive narrow widths with a Puppeteer page that resizes after entering Assistant mode.
- The Assistant mode sidebar is labelled `Assistant mode` as a navigation landmark, so `aria("Assistant mode")` also matches it inside Assistant mode. Use `button[aria-label="Assistant mode"]` to target the native row.

- The default Bot appears asynchronously. On a fresh Profile Assistant mode prepares it and opens its DM within a few hundred milliseconds; wait for `Message Assistant` before calling it missing.
- `.bh-root` alone does not mean Assistant mode: the Window Companion stage carries it too. `verify-app` waits for `.bh-root.bh-main`.
- The preview notice is modal and hides the rest of the page from the accessibility tree until it is dismissed.
- On a keyless Host, the native `Add an API key to get started` dialog can appear over Assistant mode. `verify-app` chooses `Configure later` unless `--keep-overlays` is set.

## Bottom return (#2289)

Run `BH_E2E_INSTANCE=<task-instance.json> node scripts/e2e-bot-mode-exit.mjs` against the task-owned isolated Host. It requires no model call. The journey verifies the visible resting button beneath settings, pointer and Enter/Space exit, native navigation restoration, remembered manual exit after reload, remembered Assistant mode after re-entry/reload, unchanged PersonaBot facts and saved layout, the original logo exit, a short window and narrow/wide transitions. Each attempt keeps screenshots, accessibility snapshots, console logs and Client observations.

For a before/after pair, the unmodified main run must fail specifically because the final rail button is still Steward settings. A shell/plugin startup failure is not this regression. Inspect both themes and localized tooltips, move the Control Rail and preserve a real conversation draft in the actual Client; save separate native Desktop evidence when available. Browser evidence does not qualify a native window.
