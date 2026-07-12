import { z } from 'zod';

export const mentorQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
  category: z.string().optional(),
  minRating: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0 && v <= 5), {
      message: 'minRating must be a number between 0 and 5',
    }),
  search: z.string().optional(),
  sortBy: z.enum(['rating', 'sessions', 'newest']).default('rating'),
});

export const mentorReviewsQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
});

export type MentorQueryDto = z.infer<typeof mentorQuerySchema>;
export type MentorReviewsQueryDto = z.infer<typeof mentorReviewsQuerySchema>;
