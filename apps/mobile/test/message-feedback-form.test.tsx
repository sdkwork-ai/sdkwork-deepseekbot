// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('expo-symbols', () => ({ SymbolView: () => null }));
vi.mock('../src/ui/selection-feedback', () => ({
  useSelectionFeedback: (_value: unknown, change: (value: string) => void) => change,
}));
vi.mock('react-native-svg', () => ({ default: () => null, Path: () => null }));
vi.mock('react-native', () => import('./react-native-shim'));
vi.mock('react-native-keyboard-controller', async () => ({
  KeyboardAwareScrollView: (await import('./react-native-shim')).ScrollView,
}));
vi.mock('../src/host/share-feedback', () => ({ shareFeedbackArchive: vi.fn() }));
import { shareFeedbackArchive } from '../src/host/share-feedback';
import { MessageFeedbackForm } from '../src/ui/chat/message-feedback';
import { createHostClient } from '../src/host/client';
import type { HostCarrier } from '../src/host/carrier';
import { interfacePreferences } from '../src/ui/interface-preferences';

it('previews and downloads the diagnostic archive without submitting anything', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await interfacePreferences.restore({
    read: async () => ({ language: 'en', appearance: 'light' }),
    write() {},
  });
  const submissions: unknown[] = [];
  const carrier: HostCarrier = {
    openSocket: () => ({ send() {}, close() {} }),
    async request(url, init) {
      if (url.endsWith('/download'))
        return { status: 200, text: async () => '', bytes: async () => new Uint8Array([80, 75]) };
      if (url.endsWith('/preview'))
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              token: 'p1',
              bytes: 10,
              canSubmit: false,
              files: [{ path: 'manifest.json', content: '{}' }],
              summary: { channels: [], sessions: [], admissions: 0, omissions: [] },
            }),
        };
      submissions.push(JSON.parse(String(init.body)));
      return { status: 500, text: async () => JSON.stringify({ error: { code: 'unexpected' } }) };
    },
  };
  const client = createHostClient({
    routes: ['https://example.ts.net'],
    credential: 'test.secret',
    carrier,
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const button = (label: string) => {
    const node = Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-label') === label,
    );
    if (!node) throw new Error('Missing ' + label);
    return node;
  };
  await act(async () =>
    root.render(
      <MessageFeedbackForm client={client} channelId="chat" messageId="m1" />,
    ),
  );
  try {
    expect(button('Download diagnostics').disabled).toBe(false);
    expect(container.querySelector('button[aria-label="Submit feedback"]')).toBeNull();
    expect(container.textContent).not.toContain('manifest.json');
    await act(async () => button('View files').click());
    expect(container.textContent).toContain('manifest.json');
    await act(async () => button('Hide files').click());
    expect(container.textContent).not.toContain('manifest.json');
    await act(async () => button('Bad').click());
    await act(async () => button('Diagnostic bundle contents').click());
    await act(async () =>
      (container.querySelector('[data-testid="feedback-inbox"]') as HTMLInputElement).click(),
    );
    expect(button('Download diagnostics').disabled).toBe(true);
    await act(async () => button('Refresh evidence').click());
    expect(button('Download diagnostics').disabled).toBe(false);
    await act(async () => button('Download diagnostics').click());
    expect(shareFeedbackArchive).toHaveBeenCalledWith(new Uint8Array([80, 75]), 'p1');
    vi.mocked(shareFeedbackArchive).mockRejectedValueOnce(new Error('save-failed'));
    await act(async () => button('Download diagnostics').click());
    await act(async () => button('Refresh evidence').click());
    await act(async () => button('Download diagnostics').click());
    expect(shareFeedbackArchive).toHaveBeenLastCalledWith(new Uint8Array([80, 75]), 'p1');
    expect(submissions).toHaveLength(0);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    client.stop();
  }
});
