import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
  unreadOnly: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export type NotificationQueryDto = z.infer<typeof notificationQuerySchema>;
