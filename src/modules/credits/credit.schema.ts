import { z } from 'zod';

export const transactionQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
  type: z
    .enum(['SIGNUP_BONUS', 'EARNED', 'SPENT', 'REFUND', 'ADMIN_ADJUSTMENT'])
    .optional(),
});

export const adminAdjustSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  amount: z
    .number()
    .int('Amount must be an integer')
    .refine((v) => v !== 0, 'Amount cannot be zero'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

export type TransactionQueryDto = z.infer<typeof transactionQuerySchema>;
export type AdminAdjustDto = z.infer<typeof adminAdjustSchema>;
