import { describe, expect, it, vi } from 'vitest';
import { createTobMaintenanceOperations } from '../src/tob/cli-maintenance-operations.js';
import type { GitService, GitStatus } from '../src/memory/managed-git.js';
import type { ReleaseService, ReleaseUpdate } from '../src/release/service.js';
import { TobError } from '../src/tob/service.js';

function fixture() {
  let git: GitStatus = {
    available: false,
    reason: 'missing',
    installable: true,
    install: { phase: 'idle' },
  };
  let update: ReleaseUpdate = {
    status: 'available',
    current: '1.0.0',
    latest: '1.1.0',
    releases: [],
    installable: true,
  };
  let pendingVersion = '1.1.0';
  const installGit = vi.fn(
    () =>
      (git = {
        available: true,
        version: '2.50.0',
        source: 'managed',
        installable: true,
        install: { phase: 'idle' },
      }),
  );
  const installRelease = vi.fn(async (version: string, guard?: () => void) => {
    guard?.();
    update = {
      status: 'restart-required',
      current: '1.0.0',
      installed: version,
      restartable: true,
    };
    return {
      status: 'installed' as const,
      current: '1.0.0',
      installed: version,
      restartable: true,
      applied: false,
    };
  });
  const restart = vi.fn(async (guard?: (version: string) => void) => {
    guard?.(pendingVersion);
    return { status: 'restarting' as const };
  });
  const prepare = createTobMaintenanceOperations({
    git: {
      status: () => git,
      install: installGit,
      settled: async () => {},
    } as unknown as GitService,
    release: {
      info: () => ({ version: '1.0.0', releases: [] }),
      update: async () => update,
      install: installRelease,
      restart,
    } as ReleaseService,
  });
  return {
    prepare,
    installGit,
    installRelease,
    restart,
    update: (value: ReleaseUpdate) => {
      update = value;
    },
    pendingVersion: (value: string) => {
      pendingVersion = value;
    },
  };
}
describe('Tob maintenance uses reviewed owner operations', () => {
  it('does not offer the removed telemetry commands', async () => {
    const f = fixture();
    expect(await f.prepare('telemetry-status', {})).toBeUndefined();
    expect(await f.prepare('telemetry-set', { enabled: true })).toBeUndefined();
  });
  it('does not install Git after source revocation and waits for one admitted install', async () => {
    const f = fixture();
    const operation = (await f.prepare('git-install', {}))!;
    await expect(
      operation.run(() => {
        throw new TobError('agent-context-expired');
      }),
    ).rejects.toMatchObject({ code: 'agent-context-expired' });
    expect(f.installGit).not.toHaveBeenCalled();
    expect(await operation.run(() => {})).toMatchObject({ available: true, source: 'managed' });
    expect(f.installGit).toHaveBeenCalledOnce();
  });
  it('requires confirmation and an available exact version before offering install', async () => {
    const f = fixture();
    await expect(f.prepare('release-install', { version: '1.1.0' })).rejects.toMatchObject({
      code: 'confirmation-required',
    });
    await expect(
      f.prepare('release-install', { version: '2.0.0', confirm: true }),
    ).rejects.toMatchObject({ code: 'maintenance-unavailable' });
    await expect(f.prepare('release-restart', { confirm: true })).rejects.toMatchObject({
      code: 'restart-not-pending',
    });
    expect(f.installRelease).not.toHaveBeenCalled();
  });
  it('rechecks available release after review and installs only once', async () => {
    const f = fixture();
    const operation = (await f.prepare('release-install', { version: '1.1.0', confirm: true }))!;
    f.update({ status: 'current', current: '1.0.0', latest: '1.0.0' });
    await expect(operation.run(() => {})).rejects.toMatchObject({ code: 'stale-setting' });
    expect(f.installRelease).not.toHaveBeenCalled();
    f.update({
      status: 'available',
      current: '1.0.0',
      latest: '1.1.0',
      releases: [],
      installable: true,
    });
    expect(await operation.run(() => {})).toMatchObject({
      status: 'installed',
      installed: '1.1.0',
    });
    await expect(operation.run(() => {})).rejects.toMatchObject({ code: 'stale-setting' });
    expect(f.installRelease).toHaveBeenCalledOnce();
  });
  it('does not report another installed version as the reviewed installation', async () => {
    const f = fixture();
    const operation = (await f.prepare('release-install', { version: '1.1.0', confirm: true }))!;
    f.installRelease.mockImplementationOnce(async () => ({
      status: 'installed',
      current: '1.0.0',
      installed: '1.2.0',
      restartable: true,
      applied: false,
    }));
    await expect(operation.run(() => {})).rejects.toMatchObject({ code: 'readback-mismatch' });
  });

  it('checks the pending version again at the native restart boundary', async () => {
    const f = fixture();
    f.update({
      status: 'restart-required',
      current: '1.0.0',
      installed: '1.1.0',
      restartable: true,
    });
    const operation = (await f.prepare('release-restart', { confirm: true }))!;
    expect(operation.proposal).toMatchObject({
      patch: { installed: '1.1.0', restart: true, confirm: true },
    });
    f.pendingVersion('1.2.0');
    await expect(operation.run(() => {})).rejects.toMatchObject({ code: 'stale-setting' });
    f.pendingVersion('1.1.0');
    expect(await operation.run(() => {})).toEqual({ status: 'restarting' });
  });
  it('reports admitted writes as uncertain when authorization expires during async work', async () => {
    const f = fixture();
    const operation = (await f.prepare('git-install', {}))!;
    let checks = 0;
    await expect(
      operation.run(() => {
        if (++checks > 1) throw new TobError('agent-context-expired');
      }),
    ).rejects.toMatchObject({ code: 'operation-outcome-uncertain' });
    expect(f.installGit).toHaveBeenCalledOnce();
  });
  it('rejects unknown inputs and leaves unrelated commands to the next provider', async () => {
    const f = fixture();
    await expect(
      f.prepare('release-restart', { confirm: true, force: true }),
    ).rejects.toMatchObject({ code: 'invalid-input' });
    expect(await f.prepare('unknown', {})).toBeUndefined();
  });
});
