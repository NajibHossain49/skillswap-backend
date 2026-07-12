import { prisma } from '../../prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../../utils/errors';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { notificationService } from '../../services/notification.service';
import { creditService } from '../../services/credit.service';
import { notDeleted } from '../../utils/prisma-filters';
import { sessionBookedEmail, sessionCancelledEmail } from '../../services/email.service';
import {
  CreateSessionDto,
  UpdateSessionStatusDto,
  SessionQueryDto,
  CreateFeedbackDto,
} from './session.schema';
import { Prisma, Role, SessionStatus, NotificationType, CreditTxnType } from '@prisma/client';

const SESSION_INCLUDE = {
  mentor: { select: { id: true, name: true, email: true } },
  learner: { select: { id: true, name: true, email: true } },
  skill: { select: { id: true, title: true, category: true } },
  feedback: true,
};

// A Session auto-gets a Jitsi meeting room when it becomes SCHEDULED.
const jitsiLink = (sessionId: string): string => `https://meet.jit.si/skillswap-${sessionId}`;

export class SessionService {
  async createSession(mentorId: string, dto: CreateSessionDto) {
    const skill = await prisma.skill.findFirst({
      where: { id: dto.skillId, isActive: true, ...notDeleted },
    });
    if (!skill) throw new NotFoundError('Skill not found');

    const scheduledAt = new Date(dto.scheduledAt);
    if (await this.hasMentorConflict(mentorId, scheduledAt, dto.duration)) {
      throw new ConflictError('You already have a session overlapping this time');
    }

    return prisma.session.create({
      data: {
        ...dto,
        mentorId,
        scheduledAt,
      },
      include: SESSION_INCLUDE,
    });
  }

  /**
   * Returns true if the mentor already has a SCHEDULED or PENDING session whose
   * time window overlaps [start, start + durationMin).
   */
  private async hasMentorConflict(
    mentorId: string,
    start: Date,
    durationMin: number,
  ): Promise<boolean> {
    const endMs = start.getTime() + durationMin * 60_000;
    // Longest allowed session is 480 min, so an 8h look-back covers any overlap.
    const lookback = new Date(start.getTime() - 8 * 60 * 60 * 1000);

    const candidates = await prisma.session.findMany({
      where: {
        ...notDeleted,
        mentorId,
        status: { in: ['SCHEDULED', 'PENDING'] },
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

  async getAllSessions(query: SessionQueryDto, userId?: string, userRole?: Role) {
    const { page, limit, status, mentorId, skillId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...notDeleted,
      ...(status && { status }),
      ...(mentorId && { mentorId }),
      ...(skillId && { skillId }),
    };

    // Non-admins see only their own sessions or available sessions
    if (userRole === 'MENTOR') {
      where.mentorId = userId;
    } else if (userRole === 'LEARNER') {
      where.OR = [{ learnerId: userId }, { learnerId: null, status: 'PENDING' }];
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: SESSION_INCLUDE,
      }),
      prisma.session.count({ where }),
    ]);

    return { sessions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getSessionById(sessionId: string, userId: string, userRole: Role) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, ...notDeleted },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundError('Session not found');

    if (
      userRole !== 'ADMIN' &&
      session.mentorId !== userId &&
      session.learnerId !== userId
    ) {
      throw new ForbiddenError('Access denied');
    }

    return session;
  }

  /**
   * Net credit impact of a session on the learner (SPENT is negative, REFUND
   * positive). A still-held booking nets to `-creditCost`; once refunded it
   * nets back to 0. Used to derive the exact amount to earn out / refund so the
   * numbers always reconcile against the ledger and stay idempotent.
   */
  private async learnerNetForSession(
    tx: Prisma.TransactionClient,
    sessionId: string,
    learnerId: string,
  ): Promise<number> {
    const agg = await tx.creditTransaction.aggregate({
      where: { sessionId, userId: learnerId },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  async bookSession(sessionId: string, learnerId: string) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, ...notDeleted },
      include: { skill: { select: { creditCost: true } } },
    });
    if (!session) throw new NotFoundError('Session not found');
    if (session.mentorId === learnerId) throw new ValidationError('Mentors cannot book their own sessions');

    const creditCost = session.skill.creditCost;

    // Fail fast with a clear 400 before we attempt to claim the slot so the
    // learner is not told the slot is taken when the real problem is credits.
    const learner = await prisma.user.findFirst({
      where: { id: learnerId, ...notDeleted },
      select: { creditBalance: true },
    });
    if (!learner) throw new NotFoundError('User not found');
    if (learner.creditBalance < creditCost) {
      throw new ValidationError(
        `Insufficient credits: this session costs ${creditCost} credit(s) but your balance is ${learner.creditBalance}`,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Atomic guarded write: only one concurrent booking can flip the row from
      // an available PENDING/unclaimed state to SCHEDULED.
      const result = await tx.session.updateMany({
        where: { id: sessionId, learnerId: null, status: 'PENDING' },
        data: { learnerId, status: 'SCHEDULED', meetingLink: jitsiLink(sessionId) },
      });
      if (result.count === 0) {
        throw new ConflictError('Session is no longer available');
      }

      // HOLD the credits. transfer re-reads the balance under a row lock, so a
      // concurrent spend cannot overdraw the learner despite the pre-check.
      await creditService.transfer(
        {
          userId: learnerId,
          amount: -creditCost,
          type: CreditTxnType.SPENT,
          sessionId,
          description: `Booked session "${session.title}"`,
        },
        tx,
      );

      return tx.session.findUnique({ where: { id: sessionId }, include: SESSION_INCLUDE });
    });
    if (!updated) throw new NotFoundError('Session not found');

    // Notify the mentor — never let this break the booking.
    const link = `${config.appUrl}/sessions/${updated.id}`;
    const learnerName = updated.learner?.name ?? 'A learner';
    void notificationService
      .notify({
        userId: updated.mentorId,
        type: NotificationType.SESSION_BOOKED,
        title: 'New session booking',
        body: `${learnerName} booked your session "${updated.title}"`,
        link,
        metadata: { sessionId: updated.id },
        email: {
          to: updated.mentor.email,
          subject: 'New session booking',
          html: sessionBookedEmail(
            updated.mentor.name,
            learnerName,
            updated.title,
            updated.scheduledAt,
            link,
          ),
        },
      })
      .catch((err) => logger.error({ msg: 'Failed to send session booked notification', err }));

    return updated;
  }

  async updateSessionStatus(
    sessionId: string,
    userId: string,
    userRole: Role,
    dto: UpdateSessionStatusDto,
  ) {
    const session = await prisma.session.findFirst({ where: { id: sessionId, ...notDeleted } });
    if (!session) throw new NotFoundError('Session not found');

    // Role-based status update checks
    if (userRole === 'MENTOR' && session.mentorId !== userId) {
      throw new ForbiddenError('Access denied');
    }
    if (userRole === 'LEARNER' && session.learnerId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Validate status transitions
    const validTransitions: Record<SessionStatus, SessionStatus[]> = {
      PENDING: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[session.status];
    if (!allowed.includes(dto.status as SessionStatus)) {
      throw new ValidationError(
        `Cannot transition from ${session.status} to ${dto.status}`,
      );
    }

    const nextStatus = dto.status as SessionStatus;

    // The status flip and every credit movement it triggers must commit together.
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: nextStatus,
          // Auto-provision a meeting room when the session becomes SCHEDULED.
          ...(nextStatus === 'SCHEDULED' &&
            !session.meetingLink && { meetingLink: jitsiLink(sessionId) }),
        },
        include: SESSION_INCLUDE,
      });

      if (nextStatus === 'COMPLETED') {
        // Release the held credits to the mentor as earnings, matching the exact
        // amount the learner was charged, then count the taught session.
        if (u.learnerId) {
          const net = await this.learnerNetForSession(tx, sessionId, u.learnerId);
          const held = Math.max(0, -net);
          if (held > 0) {
            await creditService.transfer(
              {
                userId: u.mentorId,
                amount: held,
                type: CreditTxnType.EARNED,
                sessionId,
                description: `Earned for completing "${u.title}"`,
              },
              tx,
            );
          }
        }
        await tx.user.update({
          where: { id: u.mentorId },
          data: { totalSessionsTaught: { increment: 1 } },
        });
      } else if (nextStatus === 'CANCELLED' && u.learnerId) {
        // Refund the learner in full when the session is cancelled before it
        // starts, or whenever the mentor is the one cancelling (no penalty).
        const cancelledByMentor = u.mentorId === userId;
        const startsInFuture = u.scheduledAt.getTime() > Date.now();
        if (cancelledByMentor || startsInFuture) {
          const net = await this.learnerNetForSession(tx, sessionId, u.learnerId);
          const refundable = Math.max(0, -net);
          if (refundable > 0) {
            await creditService.transfer(
              {
                userId: u.learnerId,
                amount: refundable,
                type: CreditTxnType.REFUND,
                sessionId,
                description: `Refund for cancelled session "${u.title}"`,
              },
              tx,
            );
          }
        }
      }

      return u;
    });

    const link = `${config.appUrl}/sessions/${updated.id}`;

    if (updated.status === 'CANCELLED') {
      // Notify every involved party except whoever performed the cancellation.
      const recipients = [updated.mentor, updated.learner].filter(
        (party): party is NonNullable<typeof party> => !!party && party.id !== userId,
      );
      for (const recipient of recipients) {
        void notificationService
          .notify({
            userId: recipient.id,
            type: NotificationType.SESSION_CANCELLED,
            title: 'Session cancelled',
            body: `The session "${updated.title}" has been cancelled`,
            link,
            metadata: { sessionId: updated.id },
            email: {
              to: recipient.email,
              subject: 'Session cancelled',
              html: sessionCancelledEmail(
                recipient.name,
                updated.title,
                updated.scheduledAt,
                link,
              ),
            },
          })
          .catch((err) =>
            logger.error({ msg: 'Failed to send session cancelled notification', err }),
          );
      }
    } else if (updated.status === 'COMPLETED' && updated.learner) {
      // Nudge the learner to leave feedback (in-app only).
      void notificationService
        .notify({
          userId: updated.learner.id,
          type: NotificationType.SESSION_COMPLETED,
          title: 'Session completed',
          body: `Your session "${updated.title}" is complete. Leave feedback to help others!`,
          link: `${config.appUrl}/sessions/${updated.id}/feedback`,
          metadata: { sessionId: updated.id },
        })
        .catch((err) =>
          logger.error({ msg: 'Failed to send session completed notification', err }),
        );
    }

    return updated;
  }

  async addFeedback(sessionId: string, learnerId: string, dto: CreateFeedbackDto) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, ...notDeleted },
      include: {
        feedback: true,
        mentor: { select: { id: true, name: true, email: true } },
        learner: { select: { id: true, name: true } },
      },
    });
    if (!session) throw new NotFoundError('Session not found');
    if (session.learnerId !== learnerId) throw new ForbiddenError('Only the learner can leave feedback');
    if (session.status !== 'COMPLETED') throw new ValidationError('Session must be completed to leave feedback');
    if (session.feedback) throw new ValidationError('Feedback already submitted for this session');

    // Persist the feedback and recompute the mentor's denormalized rating in one
    // transaction. The average is recomputed from scratch with an aggregate over
    // every feedback on the mentor's sessions — never a naive incremental mean —
    // so it stays exact even if feedback is edited or removed later.
    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.feedback.create({
        data: { sessionId, learnerId, ...dto },
        include: { session: { select: { id: true, title: true } } },
      });

      const agg = await tx.feedback.aggregate({
        where: { session: { mentorId: session.mentorId } },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.user.update({
        where: { id: session.mentorId },
        data: {
          ratingAvg: agg._avg.rating ?? 0,
          ratingCount: agg._count.rating,
        },
      });

      return created;
    });

    // Notify the mentor that feedback was received (in-app only).
    const link = `${config.appUrl}/sessions/${session.id}`;
    const learnerName = session.learner?.name ?? 'A learner';
    void notificationService
      .notify({
        userId: session.mentorId,
        type: NotificationType.FEEDBACK_RECEIVED,
        title: 'New feedback received',
        body: `${learnerName} left ${dto.rating}-star feedback on "${session.title}"`,
        link,
        metadata: { sessionId: session.id, rating: dto.rating },
      })
      .catch((err) => logger.error({ msg: 'Failed to send feedback notification', err }));

    return feedback;
  }

  async getSessionFeedback(sessionId: string) {
    const feedback = await prisma.feedback.findUnique({
      where: { sessionId },
      include: {
        learner: { select: { id: true, name: true } },
        session: { select: { id: true, title: true } },
      },
    });
    if (!feedback) throw new NotFoundError('Feedback not found');
    return feedback;
  }

  async getMentorStats(mentorId: string) {
    const [total, byStatus, avgRating] = await Promise.all([
      prisma.session.count({ where: { mentorId, ...notDeleted } }),
      prisma.session.groupBy({
        by: ['status'],
        where: { mentorId, ...notDeleted },
        _count: { status: true },
      }),
      prisma.feedback.aggregate({
        where: { session: { mentorId, ...notDeleted } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return { total, byStatus, avgRating };
  }
}

export const sessionService = new SessionService();
