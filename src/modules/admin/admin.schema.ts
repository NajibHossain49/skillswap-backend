import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
  actorId: z.string().optional(),
  entity: z.string().optional(),
});

export type AuditLogQueryDto = z.infer<typeof auditLogQuerySchema>;
