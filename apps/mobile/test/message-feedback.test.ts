import { describe, expect, it } from 'vitest';
import { createHostClient } from '../src/host/client';
import { createMessageFeedback } from '../src/host/message-feedback';
import type { HostCarrier } from '../src/host/carrier';

describe('phone diagnostic archive through the authenticated Host client', () => {
  it('previews the selected evidence and never exposes a submit action', async () => {
    const requests: Array<{ url: string; body: unknown; credential: string | undefined }> = [];
    const carrier: HostCarrier = {
      openSocket: () => ({ send() {}, close() {} }),
      async request(url, init) {
        requests.push({
          url,
          body: JSON.parse(String(init.body)),
          credential: init.headers?.authorization,
        });
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              token: 'preview-token',
              bytes: 12,
              files: [{ path: 'manifest.json', content: '{}' }],
              summary: { channels: [], sessions: [], admissions: 0, omissions: [] },
            }),
        };
      },
    };
    const client = createHostClient({
      routes: ['https://example.ts.net'],
      credential: 'phone.secret',
      carrier,
    });
    const feedback = createMessageFeedback(client);
    expect(Object.keys(feedback).sort()).toEqual(['download', 'preview']);
    const preview = await feedback.preview({ channelId: 'chat', messageId: 'anchor' });
    expect(preview.files[0]?.path).toBe('manifest.json');
    expect(requests[0]?.url).toBe(
      'https://example.ts.net/botharness-device/api/botharness/message-feedback/preview',
    );
    expect(requests[0]?.credential).toBe('Device phone.secret');
    client.stop();
  });
});

it('downloads evidence bytes through the same authenticated gateway', async () => {
  const bytes = new Uint8Array([80, 75, 3, 4]);
  const client = createHostClient({
    routes: ['https://example.ts.net'],
    credential: 'phone.secret',
    carrier: {
      openSocket: () => ({ send() {}, close() {} }),
      async request(url, init) {
        expect(url).toContain('/botharness-device/api/botharness/message-feedback/download');
        expect(init.headers?.authorization).toBe('Device phone.secret');
        return {
          status: 200,
          text: async () => {
            throw new Error('binary must not decode as text');
          },
          bytes: async () => bytes,
        };
      },
    },
  });
  expect(await createMessageFeedback(client).download('preview-token')).toEqual(bytes);
  client.stop();
});
