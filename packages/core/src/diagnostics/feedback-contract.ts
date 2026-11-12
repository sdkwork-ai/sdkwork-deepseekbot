import { z } from 'zod';

export const feedbackTags = {
  good: ['accurate', 'completed', 'understood', 'fast'],
  bad: [
    'incorrect',
    'instructions',
    'incomplete',
    'no-response',
    'delivery',
    'slow',
    'interface',
    'other',
  ],
} as const;

export const feedbackSelectionSchema = z
  .object({
    channelId: z.string().min(1).max(200),
    messageId: z.string().min(1).max(200),
    before: z.number().int().min(0).max(100).default(20),
    after: z.number().int().min(0).max(100).default(20),
    conversation: z.boolean().default(true),
    sessions: z.boolean().default(true),
    inbox: z.boolean().default(true),
    deliveries: z.boolean().default(true),
    relatedChats: z.boolean().default(true),
    wholeSessions: z.boolean().default(false),
    failureTurn: z.boolean().default(false),
  })
  .strict();

export type FeedbackSelection = z.infer<typeof feedbackSelectionSchema>;
export type FeedbackSelectionInput = z.input<typeof feedbackSelectionSchema>;

export const feedbackPreviewSchema = z.object({
  token: z.string(),
  bytes: z.number(),
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  summary: z.object({
    channels: z.array(z.object({ name: z.string(), messages: z.number(), role: z.string() })),
    sessions: z.array(z.unknown()),
    admissions: z.number(),
    omissions: z.array(z.object({ kind: z.string(), detail: z.string() })),
  }),
});
export const feedbackErrorSchema = z.object({ error: z.object({ code: z.string() }) });

export type FeedbackPreview = z.infer<typeof feedbackPreviewSchema>;
