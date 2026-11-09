import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach } from 'vitest';

import type { MemoryStore, MemoryWriteInput, MemoryWriteResult } from '../src/index.js';
import {
  createSessionOwnership,
  type SessionOwnership,
  type SessionRootRole,
} from '../src/sessions/ownership.js';
import {
  attachOperationalModule,
  mountOperationalDatabase,
  type OperationalDatabaseOwner,
} from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';

const roots: string[] = [];
const owners: OperationalDatabaseOwner[] = [];

export function trackTestOwner(owner: OperationalDatabaseOwner): OperationalDatabaseOwner {
  owners.push(owner);
  return owner;
}

export const FIXED_NOW = (): Date => new Date('2026-09-17T00:00:00.000Z');

export function createTempRoot(prefix = 'botharness-test-'): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  roots.push(root);
  return root;
}

export interface HeldProfileWriterLease {
  readonly metadata: {
    instanceId: string;
    pid: number;
    hostname: string;
    acquiredAt: string;
  };
  release(): void;
}

const heldLeases: (() => void)[] = [];

export function holdProfileWriterLease(
  dshHome: string,
  instanceId = 'external-host',
): HeldProfileWriterLease {
  const root = join(dshHome, 'botharness');
  mkdirSync(root, { recursive: true });
  const lease = new DatabaseSync(join(root, 'botharness.writer-lock.db'), { timeout: 0 });
  lease.exec('PRAGMA busy_timeout = 0; BEGIN IMMEDIATE');
  const metadata = {
    instanceId,
    pid: process.pid,
    hostname: hostname(),
    acquiredAt: new Date().toISOString(),
  };
  writeFileSync(join(root, 'botharness.writer.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    try {
      if (lease.isTransaction) lease.exec('ROLLBACK');
    } catch {}
    lease.close();
  };
  heldLeases.push(release);
  return { metadata, release };
}

export function cleanupTempRoots(): void {
  while (heldLeases.length > 0) heldLeases.pop()?.();
  while (owners.length > 0) owners.pop()?.close();
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined)
      rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

afterEach(cleanupTempRoots);

export function remember(store: MemoryStore, input: MemoryWriteInput): Promise<MemoryWriteResult> {
  return store.write(input);
}

export function createTestOwnership(
  seeded: Record<string, { botSlug: string; rootRole?: SessionRootRole }> = {},
): SessionOwnership {
  const owner = mountOperationalDatabase({
    dshHome: createTempRoot('botharness-test-ownership-'),
    schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
  });
  trackTestOwner(owner);
  const ownership = createSessionOwnership(attachOperationalModule(owner, 'session-ownership'));
  for (const [sessionId, entry] of Object.entries(seeded)) {
    ownership.claim({
      sessionId,
      botSlug: entry.botSlug,
      rootRole: entry.rootRole ?? 'assignment',
      at: '2026-09-19T00:00:00.000Z',
    });
  }
  return ownership;
}
