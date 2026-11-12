# ADR-0308: Product telemetry and its first-party ingest are removed

Status: Accepted

Date: 2026-11-12

Supersedes the plugin and mobile halves of [ADR-0132](0132-anonymous-posthog-telemetry-and-campaign-short-links.md) and [ADR-0214](0214-mobile-statistics-use-explicit-consent-and-an-independent-install-id.md). The campaign short links and their click counting in ADR-0132 are unaffected.

## Context

Tobs shipped automatic anonymous usage statistics from three places: the DSH Host (`packages/core/src/telemetry`), the Web/Desktop Client (event calls, a first-run notice and a Settings switch) and the Expo app (a PostHog React Native adapter and its own switch). The Host batch and mobile events were sent through the first-party proxy at `https://t.botharness.ai` (`packages/ingest`), which forwarded them to PostHog Cloud US.

The Human decided the product should collect no statistics at all: remove the notice, remove every collection and upload path, and remove the `t.botharness.ai` collection service. Deliberate Message Feedback had already been reduced to a local diagnostic download in this change; the automatic statistics are not replaced by another analytics backend.

## Decision

- Delete the Host telemetry service, its event registry, context, exception capture, daily-usage and active-day reporting, client-issue reporter and the `telemetry` core config field. Bots, Marketplace installs, onboarding, IM sign-in and runtime delegation no longer record events, and no exception is reported anywhere automatically.
- Delete the Client telemetry notice, its Settings switch, the `telemetryEvent` bridge method and every Client call site. No notice appears on first run.
- Delete the mobile telemetry owner, its PostHog dependency and its settings/notice surfaces.
- Delete the `packages/ingest` Worker and every code path that posted to it: `t.botharness.ai/batch/` has no product sender. Message Feedback keeps only `preview` and `download`; its rating form and `/submit` action are gone, and its archive never leaves the device unless a Human shares it.
- Keep the separate, explicit diagnostic-log export and the local diagnostic bundle. They are user-initiated files, not automatic collection.
- Keep campaign short-link click counting (`packages/links`) and the marketing site's own analytics: they do not use `t.botharness.ai` and are not product telemetry.
- Remove the `telemetry-status` / `telemetry-set` CLI commands, `DO_NOT_TRACK` and `BOTHARNESS_TELEMETRY` handling, and their configuration documentation.

## Consequences

- There is no install ID, event queue, flush timer, retry or upload endpoint to maintain, test or explain in a privacy notice.
- An operator can no longer opt back into anonymous statistics. A future decision that wants telemetry must add a new owner, endpoint and consent model rather than reviving these switches.
- Historical event data already stored in PostHog is outside this repository and is not deleted by this change. The Worker can be undeployed separately.
- ADR-0132's shared-ingest section and ADR-0214's mobile statistics remain historical records; ADR-0132's campaign short-link design stays current.
