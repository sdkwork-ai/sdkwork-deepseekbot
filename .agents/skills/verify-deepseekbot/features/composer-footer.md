# Composer footer and reply speed

## Sub-features

- The composer card is the shell's `InputBar`: the draft on top, then one control row with the attach circle, the workspace seat, the model seat and the primary Send button. The model seat carries the shell's model picker when the Host publishes it.
- Below the card, the dock holds the arranged readings: token usage and optional generation speed, each a plain 13/20 reading, plus the context-occupancy ring. Web defaults show the usage reading and keep speed off.
- Right-click or long-press the dock, or focus it and press Shift+F10, to open its visibility panel, arrange the layout or restore defaults. Switches keep the panel open. The `/footer` composer shortcut also opens it, even after all items are hidden.
- Arrange mode supports pointer dragging with an insertion marker. Arrow keys reorder the focused item; Ctrl/Command + arrows move it left/right. Escape or an outside click finishes.
- Preferences persist in this browser's localStorage and synchronize between same-origin tabs. They do not change Host permissions or other devices.
- The dock stays on one line with ellipsis on long labels. At 480px or less of footer width, the usage reading collapses to icons with full names in tooltips and accessible labels; numeric usage/speed stays visible. Hiding every applicable item collapses the dock and the card moves down.
- Optional speed labels use a completed model step. Reply and dock labels both show only a number followed by `tps` (for example `36 tps`), with no average or approximation prefix. The average is bounded to 20 measured replies within 200 messages and at most four pages. No timer, per-token query or hidden history scan is used.

## How to get to it (user POV)

Open a Bot DM in Assistant mode. The model and workspace seats sit in the composer's own control row; the readings sit in the dock below it. Right-click or long-press its blank area or a reading to open Footer settings. In a group the dock offers speed only. Type `/footer` and select the shortcut to recover a hidden footer.

## Driving it with verify-app

Launch an isolated named Host and run doctor. Use its dedicated QA Bot and the real model path in [bot-dm-reply.md](bot-dm-reply.md) to obtain one completed reply.

1. Read the saved ARIA snapshot: the card's control row exposes the attach button, the workspace seat and the model seat; the dock group is named by `composerContext.label` and holds the usage reading.
2. Right-click the dock group and toggle Generation speed. The speed reading appears only when canonical `botharness/channelTimeline` contains usable `perf` values. Toggle it off and confirm it disappears.
3. Choose Arrange footer. Move a reading before the other and between `[data-footer-side]` zones with pointer down/move/up. Capture the insertion indicator before release. Check final DOM order and `botharness.composer-footer.v1` in browser storage.
4. On phone-width Web, tap usage and close its dialog; keep the dialog within the viewport. Enable speed and verify both readings, then disable it. Verify the workspace seat opens its dialog from the card.
5. Move the focused item using arrows and Ctrl/Command+arrows. Press Escape, reload, and check the saved order. Long-press a reading for at least 550ms and confirm settings opens without also activating it. A short tap keeps its normal action; movement, release, pointer cancellation and a second touch cancel the hold. Hide every item, close the panel and confirm the dock has zero height and the card moves down. Reload, type `/footer`, select the shortcut, and restore defaults; verify saved preferences and that the shortcut is removed from the draft. Check DM and group independently.
6. At desktop and 900/820/760/390px widths, compare the card's control row against the shell composer (28px attach circle, 34px primary circle, 13/20 seats), the dock's reading geometry and computed ellipsis styles; capture light/dark evidence. Long labels must not wrap or overflow.
7. Count timeline network requests while toggling and streaming: hidden idle makes no speed query; enabling does one bounded scan; text chunks and Human messages do not trigger another. Check the console after the journey.

## Gotchas

- Provider quota can prevent a real speed measurement even while UI/API checks pass. Preserve the failure; use an already configured test route if available, and distinguish a real reply from a fixture.
- The source PR showed speed by default. Current defaults deliberately hide it.
- A temporary localStorage write failure leaves settings usable in memory for the current page. A fresh page uses defaults if no valid stored preferences exist.
- A profile saved before the card redesign may still list the model in the footer preferences; unknown items are ignored and the defaults apply, so the model seat never renders twice.
- When capturing a pointer drag with Puppeteer, use `captureBeyondViewport: false`. The default clipped screenshot can briefly resize even a blank page to 1×1, switch responsive layouts and cancel the drag. Wait for visible controls instead of network-idle on the live SSE Client.
