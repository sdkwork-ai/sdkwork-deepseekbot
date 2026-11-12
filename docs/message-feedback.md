# Message feedback and local diagnostics

Open feedback from one saved message on desktop or mobile to collect redacted diagnostic evidence. Everything stays local: there is no submission service and no network upload. Desktop saves a ZIP; mobile opens the system save/share sheet. The user chooses whether and where to send it.

## Diagnostic bundles stay local

Chats, related Orchestrator/Assignment Sessions, Bot Inbox and delivery evidence are never uploaded. Choose the local bundle scope, inspect its redacted files, then download it if needed. No upload or share happens automatically.

Defaults include 20 visible messages on each side and related execution records. Whole-session history requires explicit selection. Missing material and diagnostic limits are shown. Redaction is best effort. Previews expire after 30 minutes; only four remain per connection.

## No submission

The former `chat:message_feedback_submit` event, the `https://t.botharness.ai/batch/` upload and the Host `/submit` action are removed. `BOTHARNESS_FEEDBACK_ENDPOINT` is no longer used. The retired archive receiver, maintainer view and 30-day deletion service are gone. Local files are controlled by their owner.

## Verification

Host and CLI regression tests confirm that preview and download work without any outbound request. UI checks cover the privacy copy and the downloaded archive. Expo Web validates browser interactions; native system save/share needs separate iOS/Android qualification.

See [ADR-0256](adr/0256-message-feedback-sends-ratings-and-keeps-diagnostics-local.md) and [ADR-0308](adr/0308-product-telemetry-and-its-ingest-service-are-removed.md).
