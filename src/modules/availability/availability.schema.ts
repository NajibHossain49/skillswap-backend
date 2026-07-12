import { z } from 'zod';

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM 24-hour format');

export const createAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    timezone: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'startTime must be earlier than endTime',
    path: ['endTime'],
  });

export const updateAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    timezone: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => !data.startTime || !data.endTime || data.startTime < data.endTime, {
    message: 'startTime must be earlier than endTime',
    path: ['endTime'],
  });

export const slotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
});

export type CreateAvailabilityDto = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityDto = z.infer<typeof updateAvailabilitySchema>;
export type SlotsQueryDto = z.infer<typeof slotsQuerySchema>;
