import type { HostClient } from './client';
import {
  feedbackSelectionSchema,
  feedbackPreviewSchema,
  feedbackErrorSchema,
  type FeedbackPreview,
  type FeedbackSelectionInput,
} from '../../../../packages/core/src/diagnostics/feedback-contract';

export function createMessageFeedback(client: Pick<HostClient, 'api'>) {
  async function preview(selection: FeedbackSelectionInput): Promise<FeedbackPreview> {
    const answer = await client.api('/api/botharness/message-feedback/preview', {
      body: feedbackSelectionSchema.parse(selection),
      timeoutMs: 75_000,
    });
    if (answer.status >= 400) {
      const error = feedbackErrorSchema.safeParse(answer.body);
      throw new Error(error.success ? error.data.error.code : 'feedback-unavailable');
    }
    return feedbackPreviewSchema.parse(answer.body);
  }
  return {
    async download(token: string): Promise<Uint8Array> {
      const answer = await client.api('/api/botharness/message-feedback/download', {
        body: { token },
        response: 'bytes',
        timeoutMs: 75_000,
      });
      if (!(answer.body instanceof Uint8Array)) {
        const error = feedbackErrorSchema.safeParse(answer.body);
        throw new Error(error.success ? error.data.error.code : 'download-failed');
      }
      return answer.body;
    },
    preview,
  };
}

export type { FeedbackPreview } from '../../../../packages/core/src/diagnostics/feedback-contract';
