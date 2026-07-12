import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
  unreadOnly: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export type NotificationQueryDto = z.infer<typeof notificationQuerySchema>;
