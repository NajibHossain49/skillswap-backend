import { prisma } from '../../prisma/client';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../utils/errors';
import { notDeleted } from '../../utils/prisma-filters';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './availability.schema';

// Bookable slots are expanded at this granularity (minutes).
const SLOT_MINUTES = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd;

export class AvailabilityService {
  async getMyAvailability(mentorId: string) {
    return prisma.availability.findMany({
      where: { mentorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getMentorAvailability(mentorId: string) {
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: 'MENTOR', isActive: true, ...notDeleted },
      select: { id: true },
    });
    if (!mentor) throw new NotFoundError('Mentor not found');

    return prisma.availability.findMany({
      where: { mentorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createAvailability(mentorId: string, dto: CreateAvailabilityDto) {
    await this.assertNoOverlap(mentorId, dto.dayOfWeek, dto.startTime, dto.endTime);

    return prisma.availability.create({
      data: {
        mentorId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async updateAvailability(mentorId: string, id: string, dto: UpdateAvailabilityDto) {
    const existing = await prisma.availability.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Availability slot not found');
    if (existing.mentorId !== mentorId) throw new ForbiddenError('Access denied');

    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;

    if (startTime >= endTime) {
      throw new ValidationError('startTime must be earlier than endTime');
    }

    await this.assertNoOverlap(mentorId, dayOfWeek, startTime, endTime, id);

    return prisma.availability.update({
      where: { id },
      data: {
        dayOfWeek,
        startTime,
        endTime,
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteAvailability(mentorId: string, id: string) {
    const existing = await prisma.availability.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Availability slot not found');
    if (existing.mentorId !== mentorId) throw new ForbiddenError('Access denied');

    await prisma.availability.delete({ where: { id } });
    return { message: 'Availability slot deleted' };
  }

  /**
   * Expands the mentor's weekly availability rules into concrete bookable slots
   * for a given date, excluding times already taken by a SCHEDULED session.
   * Times are treated as wall-clock on the given UTC date (no heavy tz lib).
   */
  async getMentorSlots(mentorId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new ValidationError('Invalid date');
    }
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const dayOfWeek = dayStart.getUTCDay();
    const now = Date.now();

    const [rules, sessions] = await Promise.all([
      prisma.availability.findMany({
        where: { mentorId, dayOfWeek, isActive: true },
        orderBy: { startTime: 'asc' },
      }),
      prisma.session.findMany({
        where: {
          ...notDeleted,
          mentorId,
          status: 'SCHEDULED',
          scheduledAt: { gte: dayStart, lt: dayEnd },
        },
        select: { scheduledAt: true, duration: true },
      }),
    ]);

    const busy = sessions.map((s) => ({
      start: s.scheduledAt.getTime(),
      end: s.scheduledAt.getTime() + s.duration * 60_000,
    }));

    const slots: { start: string; end: string }[] = [];
    for (const rule of rules) {
      const startMin = toMinutes(rule.startTime);
      const endMin = toMinutes(rule.endTime);
      for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
        const slotStart = dayStart.getTime() + m * 60_000;
        const slotEnd = slotStart + SLOT_MINUTES * 60_000;

        if (slotStart <= now) continue; // no booking in the past
        if (busy.some((b) => rangesOverlap(slotStart, slotEnd, b.start, b.end))) continue;

        slots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }
    }

    return { date, slots };
  }

  private async assertNoOverlap(
    mentorId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const sameDay = await prisma.availability.findMany({
      where: {
        mentorId,
        dayOfWeek,
        isActive: true,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    const overlaps = sameDay.some((slot) =>
      rangesOverlap(startMin, endMin, toMinutes(slot.startTime), toMinutes(slot.endTime)),
    );
    if (overlaps) {
      throw new ConflictError('Availability slot overlaps an existing slot on the same day');
    }
  }
}

export const availabilityService = new AvailabilityService();
