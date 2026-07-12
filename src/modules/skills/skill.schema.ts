import { z } from 'zod';

const skillLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

const tagsSchema = z
  .array(z.string().min(1).max(20, 'Each tag must be at most 20 characters'))
  .max(5, 'At most 5 tags are allowed');

export const createSkillSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  category: z.string().min(2).max(50),
  level: skillLevelEnum.default('BEGINNER'),
  tags: tagsSchema.default([]),
  creditCost: z.number().int().min(1, 'Credit cost must be at least 1').max(10, 'Credit cost cannot exceed 10').default(1),
});

export const updateSkillSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  category: z.string().min(2).max(50).optional(),
  level: skillLevelEnum.optional(),
  tags: tagsSchema.optional(),
  creditCost: z.number().int().min(1).max(10).optional(),
});

export const skillQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('10')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 10, 1), 100)),
  category: z.string().optional(),
  search: z.string().optional(),
  level: skillLevelEnum.optional(),
  tags: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    ),
  minRating: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0 && v <= 5), {
      message: 'minRating must be a number between 0 and 5',
    }),
});

export type CreateSkillDto = z.infer<typeof createSkillSchema>;
export type UpdateSkillDto = z.infer<typeof updateSkillSchema>;
export type SkillQueryDto = z.infer<typeof skillQuerySchema>;
