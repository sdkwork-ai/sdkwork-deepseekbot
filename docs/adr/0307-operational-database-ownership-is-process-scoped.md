---
Status: Accepted
Date: 2026-11-09
---

# Operational database ownership is process-scoped

Amends the writer-lease ownership in [ADR-0041](0041-one-database-owns-botharness-operational-state.md). A DSH Desktop profile can apply its plugin tree twice in one Host process (a primary boot that is disposed, then the profile that serves the Client), and a reload repeats that handover. The second mount used to lose the OS writer lease to the still-live first mount, enter recovery mode with `lease-unavailable`, and leave the Client with no roster even though the process already owned the profile.

## Context

`mountOperationalDatabase` opened a lock database, ran `BEGIN IMMEDIATE`, and returned a fresh owner. SQLite grants that lock to one connection at a time, so any second mount in the same process failed exactly like a second Host process. That is correct across process boundaries, where two writers must not interleave, but wrong inside one process: the earlier mount was on its way out, and the process had already passed every single-writer check.

The failure was permanent for the Client. The replacement plugin instance mounted in recovery mode, the previous instance was disposed seconds later and released the lease, and nothing retried. The roster, Channels, Sessions and operations stayed unavailable until the whole Host restarted. Diagnostics also could not distinguish "another Host owns this profile" from "this Host mounted twice".

## Decision

The operational database owner is **one object per profile path per process**, stored in a registry on `globalThis` under the versioned `Symbol.for('botharness.operational-database.registry.v2')` key. A mount resolves the canonical `botharness.db` path and:

- if this process already holds a **ready** owner for that path at the same Schema Generation, it attaches a new handle to that owner instead of opening a second connection or taking the lease again;
- otherwise it mounts privately. The OS writer lease still decides across processes, and a different Schema Generation never shares, because it would either see a newer database (`upgrade-required`) or silently skip its own migration.

Every mount returns a **handle**, never the shared owner directly. A handle owns its listeners, its `onOperationalDatabaseClose` cleanup and one close. Closing a handle detaches only that caller; the shared connection, lease metadata and OS writer lease are released by the last handle. `diagnostics().mounts` reports how many handles share the owner, and Host startup logs `phase=shared-mount` when it is more than one. Two evaluations of the module (a stale dist beside a fresh build) share only when they agree on the registry contract version; otherwise each mounts privately and the lease decides.

The offline `deepseekbot` CLI sets `shareProcessOwner: false`. Maintenance is its own writer by definition: it must fail coded with `lease-unavailable` while a Host owns the profile, never join a live Host's owner because it happens to run in the same process.

Recovery from a foreign lease holder is unchanged: the mount fails closed with `lease-unavailable`, keeps only read-only diagnostics, and the lease holder's identity (`instanceId`, pid, hostname, `acquiredAt`) stays in `diagnostics().leaseHolder`. A ready owner is promoted into the registry only after the lease and database mount succeed, so a recovering mount never masks a later successful one.

## Consequences

A Host that applies or reloads its plugin tree no longer bricks its own Client: the replacement instance serves the roster from the same connection, and the old instance's disposal no longer closes the profile underneath it. Writes, transactions, post-commit notifications and schema history stay on one SQLite authority, so sharing cannot create a second writer or a second schema generation.

The single-writer invariant across processes is intact, and `lease-unavailable` still means another Host owns the profile. Process-wide sharing is observable (`mounts`, `phase=shared-mount`) rather than silent.

Two plugin instances in one process still run their own file-backed surfaces for the overlap window between the new mount and the old disposal, as they already did for the surviving instance. Durable Messaging and ownership claims keep side effects idempotent; the overlap is bounded by the Host's own handover, not by this owner. A Host that keeps both instances alive would run both surfaces permanently, which the `shared-mount` log entry now makes visible instead of hiding behind recovery mode.
