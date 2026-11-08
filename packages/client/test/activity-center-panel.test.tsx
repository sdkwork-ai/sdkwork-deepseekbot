// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/client/activity-inbox-menu.js', () => ({ ActivityInboxHeader: () => null }));
vi.mock('../src/client/activity-center-view.js', () => ({ ActivityCenterView: () => null }));

import { createActivityCenterPanel } from '../src/client/activity-center-panel.js';
import { zhTranslate } from '../src/client/locale.js';
import { store } from '../src/client/store.js';

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function renderBadge(): Promise<void> {
  const Badge = createActivityCenterPanel({} as never, zhTranslate).tabBadge;
  act(() => root.render(createElement(Badge, { channel: undefined })));
  await settle();
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('Activity Center Dock tab', () => {
  it('shows its attention dot for unread work and clears it when the Human has none', async () => {
    act(() => store.setActivityList({ unreadCount: 0, hasAction: false }));
    await renderBadge();
    expect(host.querySelector('[data-dock-tab-dot]')).toBeNull();
    act(() => store.setActivityList({ unreadCount: 4, hasAction: false }));
    await settle();
    expect(host.querySelector('[data-dock-tab-dot]')).not.toBeNull();
    act(() => store.setActivityList({ unreadCount: 0, hasAction: false }));
    await settle();
    expect(host.querySelector('[data-dock-tab-dot]')).toBeNull();
    act(() => store.setActivityList({ unreadCount: 0, hasAction: true }));
    await settle();
    expect(host.querySelector('[data-dock-tab-dot]')).not.toBeNull();
    act(() => store.setActivityList({ unreadCount: 0, hasAction: false }));
  });
});
