// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const { dialogPrimitives } = await import('./primitive-mocks.js');
  return dialogPrimitives();
});
import { MessageFeedbackDialog } from '../src/client/message-feedback.js';
import { zhTranslate } from '../src/client/locale.js';
import { buttonNamed } from './primitive-mocks.js';
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const clean of cleanups.splice(0)) await clean();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('previews local evidence and downloads a diagnostic archive without submitting', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const paths: string[] = [];
  const requests: string[] = [];
  vi.stubGlobal('fetch', async (path: string, init: RequestInit) => {
    paths.push(path);
    requests.push(init.body?.toString() ?? '');
    if (path.endsWith('preview'))
      return {
        ok: true,
        json: async () => ({
          token: 'preview',
          bytes: 2048,
          summary: {
            channels: [{ name: 'QA', role: 'selected', messages: 41 }],
            sessions: [],
            admissions: 0,
            omissions: [],
          },
          files: [],
        }),
      };
    return {
      ok: true,
      blob: async () => new Blob(['zip-bytes'], { type: 'application/zip' }),
    };
  });
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:diagnostics'),
    revokeObjectURL: vi.fn(),
  });
  const clicked: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.download);
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(MessageFeedbackDialog, {
        channelId: 'dm',
        messageId: 'm30',
        t: zhTranslate,
        onClose() {},
      }),
    ),
  );
  cleanups.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  expect(paths[0]).toContain('/preview');
  expect(container.textContent).toContain('41');
  expect(container.textContent).not.toContain('提交反馈');
  await act(async () => buttonNamed('下载诊断包').click());
  expect(paths[1]).toContain('/download');
  expect(clicked).toEqual(['message-feedback-preview.zip']);
  expect(container.textContent).toContain('诊断包已保存到本地');
  expect(paths.some((path) => path.endsWith('/submit'))).toBe(false);
  expect(requests[0]).toContain('"channelId":"dm"');
});
