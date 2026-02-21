import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MENTOR', 'LEARNER']),
});

export const userQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('10').transform(Number),
  role: z.enum(['ADMIN', 'MENTOR', 'LEARNER']).optional(),
  search: z.string().optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;
export type UserQueryDto = z.infer<typeof userQuerySchema>;
