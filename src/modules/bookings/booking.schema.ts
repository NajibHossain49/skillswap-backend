import { z } from 'zod';

export const createBookingSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor ID'),
  skillId: z.string().uuid('Invalid skill ID'),
  proposedAt: z
    .string()
    .datetime()
    .refine((date) => new Date(date) > new Date(), 'Proposed time must be in the future'),
  duration: z.number().int().min(15).max(480),
  message: z.string().max(1000).optional(),
});

export const rejectBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const bookingQuerySchema = z.object({
  page: z.string().default('1').transform((v) => Math.max(parseInt(v, 10) || 1, 1)),
  limit: z.string().default('20').transform((v) => Math.min(Math.max(parseInt(v, 10) || 20, 1), 100)),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED']).optional(),
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
export type RejectBookingDto = z.infer<typeof rejectBookingSchema>;
export type BookingQueryDto = z.infer<typeof bookingQuerySchema>;
