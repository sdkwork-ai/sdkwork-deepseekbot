import { describe, expect, it } from 'vitest';
import { createMessageFeedbackHttp } from '../src/diagnostics/message-feedback-http.js';
import { queryChannelMessages } from '../src/channels/store.js';
import { pageChannelTimeline } from '../src/channels/timeline.js';
import type { ChannelMessage } from '../src/channels/channel.js';
import { readZip } from '../src/bots/zip-archive.js';

const base = 'http://localhost/api/botharness/message-feedback';
function fixture(reusedAssignment = false) {
  const messages: ChannelMessage[] = Array.from({ length: 61 }, (_, index) => ({
    id: `m${index}`,
    at: new Date(1_700_000_000_000 + index * 1000).toISOString(),
    author: { kind: 'human' },
    body: `Message ${index}`,
  }));
  const channel = {
    id: 'dm',
    name: 'Test',
    type: 'dm',
    botSlug: 'bot',
    members: ['bot'],
    createdAt: '',
    updatedAt: '',
  } as const;
  const handler = createMessageFeedbackHttp({
    source: {
      channels: {
        get: () => ({ ...channel, members: ['bot'] }),
        list: () => [{ ...channel, members: ['bot'] }],
        message: (_, id) => messages.find((message) => message.id === id),
        queryMessages: (id, options) => queryChannelMessages(id, messages, options),
      },
      inboxHistory: {
        list: () => ({
          items: [
            {
              sourceEventId: 'source-30',
              at: messages[30]!.at,
              kind: 'dm',
              sourceKind: 'human-message',
              state: 'handled',
              channelId: 'dm',
              snippet: 'Message 30',
            },
          ],
        }),
      },
      readDeliveries: async () => [
        {
          id: 'delivery-30',
          botSlug: 'bot',
          grantId: 'grant',
          grantRevision: 1,
          sourceEventId: 'source-30',
          text: 'Scoped delivery',
          state: 'provider-accepted',
          createdAt: messages[30]!.at,
        },
        {
          id: 'other-delivery',
          botSlug: 'bot',
          grantId: 'grant',
          grantRevision: 1,
          sourceEventId: 'other-source',
          text: 'Unrelated delivery',
          state: 'provider-accepted',
          createdAt: messages[30]!.at,
        },
      ],
      ownership: {
        rootsFor: (_slug, role) =>
          role === 'orchestrator'
            ? [
                {
                  sessionId: 'session',
                  botSlug: 'bot',
                  rootRole: 'orchestrator',
                  provenance: 'created',
                  parentSessionId: undefined,
                  cwdReference: undefined,
                  createdAt: '',
                },
              ]
            : reusedAssignment
              ? [
                  {
                    sessionId: 'assignment',
                    botSlug: 'bot',
                    rootRole: 'assignment',
                    provenance: 'created',
                    parentSessionId: undefined,
                    cwdReference: undefined,
                    createdAt: '',
                  },
                ]
              : [],
        descendantsOf: () => [],
      },
      botName: () => 'Test',
      readSession: async (id) =>
        id === 'assignment'
          ? [
              { type: 'turn/start', time: 1_700_000_040_000, data: {} },
              { type: 'turn/end', time: 1_700_000_050_000, data: {} },
            ]
          : [
              { type: 'turn/start', time: 1_700_000_000_000, data: {} },
              { type: 'turn/end', time: 1_700_000_005_000, data: {} },
              {
                type: 'user/message',
                time: 1_700_000_031_000,
                data: {
                  content: [
                    { type: 'text', text: '[Human DM]\nChannel: dm\nMessage ID: m30\nMessage 30' },
                  ],
                },
              },
              { type: 'turn/start', time: 1_700_000_032_000, data: {} },
              {
                type: 'tool/call',
                time: 1_700_000_033_000,
                data: { name: 'test', arguments: { token: 'private-credential' } },
              },
              ...(reusedAssignment
                ? [
                    {
                      type: 'tool/call',
                      time: 1_700_000_034_000,
                      data: {
                        name: 'send_assignment_request',
                        arguments: JSON.stringify({ session_id: 'assignment', text: 'Continue' }),
                      },
                    },
                  ]
                : []),
              { type: 'turn/end', time: 1_700_000_035_000, data: {} },
            ],
      environment: { version: 'test', platform: 'test', arch: 'test', node: 'test' },
    },
    readTimeline: (id, request) => pageChannelTimeline(id, messages, request),
    homes: [],
  });
  const post = (action: string, body: unknown) =>
    handler(
      new Request(`${base}/${action}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      }),
    );
  return { messages, post };
}

describe('message feedback through the Host HTTP interface', () => {
  it('includes a reused Assignment addressed through serialized native tool arguments', async () => {
    const f = fixture(true);
    const preview = await (
      await f.post('preview', { channelId: 'dm', messageId: 'm30', before: 0, after: 0 })
    ).json();
    expect(preview.summary.sessions.map((item: { id: string }) => item.id)).toEqual([
      'session',
      'assignment',
    ]);
  });
  it('does not include unrelated execution merely because its timestamps overlap', async () => {
    const f = fixture();
    const preview = await (
      await f.post('preview', { channelId: 'dm', messageId: 'm0', before: 0, after: 0 })
    ).json();
    expect(preview.summary.sessions).toEqual([]);
    expect(
      preview.summary.omissions.some(
        (item: { kind: string }) => item.kind === 'related-execution-unavailable',
      ),
    ).toBe(true);
  });
  it('keeps a related turn complete without silently expanding selected messages', async () => {
    const f = fixture();
    const selection = { channelId: 'dm', messageId: 'm30', before: 0, after: 0 };
    const preview = await (await f.post('preview', selection)).json();
    expect(preview.summary.channels[0].messages).toBe(1);
    expect(preview.summary.sessions[0].events).toBe(4);
    expect(JSON.stringify(preview).includes('private-credential')).toBe(false);
    const full = await (await f.post('preview', { ...selection, wholeSessions: true })).json();
    expect(full.summary.sessions[0].events).toBe(6);
    const without = await (
      await f.post('preview', {
        ...selection,
        conversation: false,
        sessions: false,
        inbox: false,
        deliveries: false,
      })
    ).json();
    expect(without.summary.sessions).toEqual([]);
    expect(JSON.stringify(without).includes('Message 30')).toBe(false);
  });
  it('includes only related outbound records and removes deselected delivery evidence', async () => {
    const f = fixture();
    const selection = { channelId: 'dm', messageId: 'm30' };
    const preview = await (await f.post('preview', selection)).json();
    expect(JSON.stringify(preview)).toContain('Scoped delivery');
    expect(JSON.stringify(preview).includes('Unrelated delivery')).toBe(false);
    const without = await (await f.post('preview', { ...selection, deliveries: false })).json();
    expect(JSON.stringify(without).includes('Scoped delivery')).toBe(false);
  });
  it('freezes the nearest 20 messages on either side for repeatable preview and download', async () => {
    const f = fixture();
    const response = await f.post('preview', { channelId: 'dm', messageId: 'm30' });
    expect(response.status).toBe(200);
    const preview = await response.json();
    expect(preview.canSubmit).toBeUndefined();
    expect(preview.summary.channels[0].messages).toBe(41);
    f.messages.push({
      id: 'later',
      at: new Date().toISOString(),
      author: { kind: 'human' },
      body: 'Not approved',
    });
    const download = await f.post('download', { token: preview.token });
    expect(download.status).toBe(200);
    const bytes = Buffer.from(await download.arrayBuffer());
    const files = readZip(bytes, { maxEntries: 100, maxTotalBytes: 1 << 24 });
    const readme = files.find((entry) => entry.path === 'README.md')?.data.toString();
    expect(readme).toContain('never uploaded');
    expect(readme).not.toContain('PostHog');
    const conversation = files.find((entry) => entry.path === 'channels/dm.jsonl')?.data.toString();
    expect(conversation).toContain('"id":"m10"');
    expect(conversation).toContain('"id":"m50"');
    expect(conversation?.includes('"id":"m9"')).toBe(false);
    expect(conversation?.includes('Not approved')).toBe(false);
    expect(
      Buffer.from(await (await f.post('download', { token: preview.token })).arrayBuffer()),
    ).toEqual(bytes);
  });
  it('refuses the removed submission action', async () => {
    const f = fixture();
    const preview = await (await f.post('preview', { channelId: 'dm', messageId: 'm30' })).json();
    expect(
      (
        await f.post('submit', {
          token: preview.token,
          feedback: { rating: 'bad', tags: [], comment: 'No answer' },
        })
      ).status,
    ).toBe(404);
  });
});

it('keeps failed-turn upload evidence in the local preview', async () => {
  const f = fixture();
  f.messages[36] = {
    id: 'm36',
    at: new Date(1_700_000_036_000).toISOString(),
    author: { kind: 'bot', slug: 'bot' },
    body: 'Failed',
    sessionFailure: {
      role: 'orchestrator',
      sessionId: 'session',
      requestMessageId: 'm30',
      detail: 'Failed',
    },
  };
  const response = await f.post('preview', {
    channelId: 'dm',
    messageId: 'm36',
    failureTurn: true,
  });
  expect(response.status).toBe(200);
  const preview = await response.json();
  expect(preview.uploadEvidence.prompt).toEqual([
    '[Human DM]\nChannel: dm\nMessage ID: m30\nMessage 30',
  ]);
  expect(preview.uploadEvidence.toolCalls).toHaveLength(1);
  expect(JSON.stringify(preview)).not.toContain('private-credential');
});

it('refuses turn uploads for ordinary messages', async () => {
  const f = fixture();
  expect(
    (await f.post('preview', { channelId: 'dm', messageId: 'm30', failureTurn: true })).status,
  ).toBe(400);
});
