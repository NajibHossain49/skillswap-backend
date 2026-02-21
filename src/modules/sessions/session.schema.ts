import { z } from 'zod';

export const createSessionSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID'),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z
    .string()
    .datetime()
    .refine((date) => new Date(date) > new Date(), 'Scheduled date must be in the future'),
  duration: z.number().int().min(15).max(480),
});

export const updateSessionStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
});

export const bookSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

export const sessionQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('10').transform(Number),
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  mentorId: z.string().optional(),
  skillId: z.string().optional(),
});

export const createFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type UpdateSessionStatusDto = z.infer<typeof updateSessionStatusSchema>;
export type SessionQueryDto = z.infer<typeof sessionQuerySchema>;
export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
