import { Prisma, Role, NotificationType, BookingRequestStatus, CreditTxnType } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { notificationService } from '../../services/notification.service';
import { creditService } from '../../services/credit.service';
import { notDeleted } from '../../utils/prisma-filters';
import { CreateBookingDto, RejectBookingDto, BookingQueryDto } from './booking.schema';

// Max session length (minutes) — bounds how far back we look for overlaps.
const OVERLAP_LOOKBACK_MS = 8 * 60 * 60 * 1000;

const BOOKING_INCLUDE = {
  learner: { select: { id: true, name: true, email: true } },
  mentor: { select: { id: true, name: true, email: true } },
  skill: { select: { id: true, title: true, category: true } },
  session: { select: { id: true, scheduledAt: true, status: true, meetingLink: true } },
};

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const jitsiLink = (sessionId: string): string => `https://meet.jit.si/skillswap-${sessionId}`;

export class BookingService {
  async createRequest(learnerId: string, dto: CreateBookingDto) {
    if (learnerId === dto.mentorId) {
      throw new ValidationError('You cannot request a session with yourself');
    }

    const skill = await prisma.skill.findFirst({
      where: { id: dto.skillId, isActive: true, ...notDeleted },
    });
    if (!skill) throw new NotFoundError('Skill not found');

    const mentor = await prisma.user.findFirst({ where: { id: dto.mentorId, ...notDeleted } });
    if (!mentor || mentor.role !== Role.MENTOR || !mentor.isActive) {
      throw new NotFoundError('Mentor not found');
    }

    const proposed = new Date(dto.proposedAt);
    if (proposed <= new Date()) {
      throw new ValidationError('Proposed time must be in the future');
    }

    // The proposed session must fit entirely within one of the mentor's slots.
    const dayOfWeek = proposed.getUTCDay();
    const propMin = proposed.getUTCHours() * 60 + proposed.getUTCMinutes();
    const rules = await prisma.availability.findMany({
      where: { mentorId: dto.mentorId, dayOfWeek, isActive: true },
    });
    const fits = rules.some(
      (r) => toMinutes(r.startTime) <= propMin && propMin + dto.duration <= toMinutes(r.endTime),
    );
    if (!fits) {
      throw new ValidationError("Proposed time is outside the mentor's availability");
    }

    // One open request per learner/mentor/skill.
    const duplicate = await prisma.bookingRequest.findFirst({
      where: {
        learnerId,
        mentorId: dto.mentorId,
        skillId: dto.skillId,
        status: BookingRequestStatus.PENDING,
      },
    });
    if (duplicate) {
      throw new ConflictError('You already have a pending request to this mentor for this skill');
    }

    const request = await prisma.bookingRequest.create({
      data: {
        learnerId,
        mentorId: dto.mentorId,
        skillId: dto.skillId,
        message: dto.message,
        proposedAt: proposed,
        duration: dto.duration,
      },
      include: BOOKING_INCLUDE,
    });

    void notificationService
      .notify({
        userId: dto.mentorId,
        type: NotificationType.BOOKING_REQUEST,
        title: 'New booking request',
        body: `${request.learner.name} requested a "${request.skill.title}" session`,
        link: `${config.appUrl}/bookings/${request.id}`,
        metadata: { bookingRequestId: request.id },
      })
      .catch((err) => logger.error({ msg: 'Failed to send booking request notification', err }));

    return request;
  }

  async getRequests(userId: string, role: Role, query: BookingQueryDto) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingRequestWhereInput = {
      ...(status && { status }),
    };

    if (role === Role.LEARNER) {
      where.learnerId = userId;
    } else if (role === Role.MENTOR) {
      where.mentorId = userId;
    }
    // ADMIN sees all requests.

    const [requests, total] = await Promise.all([
      prisma.bookingRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: BOOKING_INCLUDE,
      }),
      prisma.bookingRequest.count({ where }),
    ]);

    return { requests, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getRequestById(id: string, userId: string, role: Role) {
    const request = await prisma.bookingRequest.findUnique({
      where: { id },
      include: BOOKING_INCLUDE,
    });
    if (!request) throw new NotFoundError('Booking request not found');

    if (role !== Role.ADMIN && request.learnerId !== userId && request.mentorId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return request;
  }

  async acceptRequest(id: string, mentorId: string) {
    const request = await prisma.bookingRequest.findUnique({
      where: { id },
      include: { skill: { select: { title: true, creditCost: true } } },
    });
    if (!request) throw new NotFoundError('Booking request not found');
    if (request.mentorId !== mentorId) throw new ForbiddenError('Access denied');
    if (request.status !== BookingRequestStatus.PENDING) {
      throw new ValidationError('Only pending requests can be accepted');
    }

    const creditCost = request.skill.creditCost;

    // Fail fast with a clear 400 if the learner can no longer afford the session
    // before we spin up a scheduled session for them.
    const learner = await prisma.user.findFirst({
      where: { id: request.learnerId, ...notDeleted },
      select: { creditBalance: true },
    });
    if (!learner) throw new NotFoundError('Learner not found');
    if (learner.creditBalance < creditCost) {
      throw new ValidationError(
        `The learner has insufficient credits for this session (needs ${creditCost}, has ${learner.creditBalance})`,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Re-check for a conflicting SCHEDULED session inside the transaction.
      const conflict = await this.hasSchedulingConflict(
        tx,
        request.mentorId,
        request.proposedAt,
        request.duration,
      );
      if (conflict) {
        throw new ConflictError('You already have a session scheduled in this time window');
      }

      const session = await tx.session.create({
        data: {
          mentorId: request.mentorId,
          learnerId: request.learnerId,
          skillId: request.skillId,
          title: request.skill.title,
          scheduledAt: request.proposedAt,
          duration: request.duration,
          status: 'SCHEDULED',
        },
      });

      await tx.session.update({
        where: { id: session.id },
        data: { meetingLink: jitsiLink(session.id) },
      });

      // HOLD the learner's credits for the now-scheduled session.
      await creditService.transfer(
        {
          userId: request.learnerId,
          amount: -creditCost,
          type: CreditTxnType.SPENT,
          sessionId: session.id,
          description: `Booking accepted: "${request.skill.title}"`,
        },
        tx,
      );

      return tx.bookingRequest.update({
        where: { id },
        data: { status: BookingRequestStatus.ACCEPTED, sessionId: session.id },
        include: BOOKING_INCLUDE,
      });
    });

    void notificationService
      .notify({
        userId: updated.learnerId,
        type: NotificationType.BOOKING_ACCEPTED,
        title: 'Booking accepted',
        body: `${updated.mentor.name} accepted your "${updated.skill.title}" session request`,
        link: `${config.appUrl}/sessions/${updated.sessionId}`,
        metadata: { bookingRequestId: updated.id, sessionId: updated.sessionId },
      })
      .catch((err) => logger.error({ msg: 'Failed to send booking accepted notification', err }));

    return updated;
  }

  async rejectRequest(id: string, mentorId: string, dto: RejectBookingDto) {
    const request = await prisma.bookingRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Booking request not found');
    if (request.mentorId !== mentorId) throw new ForbiddenError('Access denied');
    if (request.status !== BookingRequestStatus.PENDING) {
      throw new ValidationError('Only pending requests can be rejected');
    }

    const updated = await prisma.bookingRequest.update({
      where: { id },
      data: { status: BookingRequestStatus.REJECTED, rejectReason: dto.reason },
      include: BOOKING_INCLUDE,
    });

    void notificationService
      .notify({
        userId: updated.learnerId,
        type: NotificationType.BOOKING_REJECTED,
        title: 'Booking declined',
        body: `${updated.mentor.name} declined your "${updated.skill.title}" session request`,
        link: `${config.appUrl}/bookings/${updated.id}`,
        metadata: { bookingRequestId: updated.id },
      })
      .catch((err) => logger.error({ msg: 'Failed to send booking rejected notification', err }));

    return updated;
  }

  async cancelRequest(id: string, learnerId: string) {
    const request = await prisma.bookingRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Booking request not found');
    if (request.learnerId !== learnerId) throw new ForbiddenError('Access denied');
    if (request.status !== BookingRequestStatus.PENDING) {
      throw new ValidationError('Only pending requests can be cancelled');
    }

    const updated = await prisma.bookingRequest.update({
      where: { id },
      data: { status: BookingRequestStatus.CANCELLED },
      include: BOOKING_INCLUDE,
    });

    void notificationService
      .notify({
        userId: updated.mentorId,
        type: NotificationType.SYSTEM,
        title: 'Booking request cancelled',
        body: `${updated.learner.name} cancelled their "${updated.skill.title}" session request`,
        link: `${config.appUrl}/bookings/${updated.id}`,
        metadata: { bookingRequestId: updated.id },
      })
      .catch((err) => logger.error({ msg: 'Failed to send booking cancelled notification', err }));

    return updated;
  }

  private async hasSchedulingConflict(
    client: Prisma.TransactionClient,
    mentorId: string,
    start: Date,
    durationMin: number,
  ): Promise<boolean> {
    const endMs = start.getTime() + durationMin * 60_000;
    const lookback = new Date(start.getTime() - OVERLAP_LOOKBACK_MS);

    const candidates = await client.session.findMany({
      where: {
        mentorId,
        status: 'SCHEDULED',
        scheduledAt: { gte: lookback, lt: new Date(endMs) },
      },
      select: { scheduledAt: true, duration: true },
    });

    return candidates.some((s) => {
      const sStart = s.scheduledAt.getTime();
      const sEnd = sStart + s.duration * 60_000;
      return sStart < endMs && start.getTime() < sEnd;
    });
  }
}

export const bookingService = new BookingService();
