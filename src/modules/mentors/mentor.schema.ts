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

export const applyMentorSchema = z.object({
  headline: z.string().min(3, 'Headline must be at least 3 characters').max(120),
  experience: z.string().min(20, 'Tell us about your experience (min 20 characters)').max(2000),
  linkedinUrl: z.string().url('Invalid URL').max(300).optional(),
});

export const mentorApplicationQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
  status: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export const reviewApplicationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1000).optional(),
});

export type MentorQueryDto = z.infer<typeof mentorQuerySchema>;
export type MentorReviewsQueryDto = z.infer<typeof mentorReviewsQuerySchema>;
export type ApplyMentorDto = z.infer<typeof applyMentorSchema>;
export type MentorApplicationQueryDto = z.infer<typeof mentorApplicationQuerySchema>;
export type ReviewApplicationDto = z.infer<typeof reviewApplicationSchema>;
