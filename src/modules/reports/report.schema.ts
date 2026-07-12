import { z } from 'zod';

const reportReasonEnum = z.enum([
  'SPAM',
  'HARASSMENT',
  'INAPPROPRIATE_CONTENT',
  'NO_SHOW',
  'FRAUD',
  'OTHER',
]);

export const createReportSchema = z
  .object({
    reportedUserId: z.string().uuid('Invalid user ID').optional(),
    sessionId: z.string().uuid('Invalid session ID').optional(),
    skillId: z.string().uuid('Invalid skill ID').optional(),
    reason: reportReasonEnum,
    details: z.string().min(10, 'Please describe the issue (min 10 characters)').max(2000),
  })
  .refine((d) => d.reportedUserId || d.sessionId || d.skillId, {
    message: 'A report must target a user, session, or skill',
    path: ['reportedUserId'],
  });

export const reportQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  adminNote: z.string().max(2000).optional(),
});

export type CreateReportDto = z.infer<typeof createReportSchema>;
export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
export type ResolveReportDto = z.infer<typeof resolveReportSchema>;
