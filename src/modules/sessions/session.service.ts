import { prisma } from '../../prisma/client';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import {
  CreateSessionDto,
  UpdateSessionStatusDto,
  SessionQueryDto,
  CreateFeedbackDto,
} from './session.schema';
import { Role, SessionStatus } from '@prisma/client';

const SESSION_INCLUDE = {
  mentor: { select: { id: true, name: true, email: true } },
  learner: { select: { id: true, name: true, email: true } },
  skill: { select: { id: true, title: true, category: true } },
  feedback: true,
};

export class SessionService {
  async createSession(mentorId: string, dto: CreateSessionDto) {
    const skill = await prisma.skill.findUnique({ where: { id: dto.skillId, isActive: true } });
    if (!skill) throw new NotFoundError('Skill not found');

    return prisma.session.create({
      data: {
        ...dto,
        mentorId,
        scheduledAt: new Date(dto.scheduledAt),
      },
      include: SESSION_INCLUDE,
    });
  }

  async getAllSessions(query: SessionQueryDto, userId?: string, userRole?: Role) {
    const { page, limit, status, mentorId, skillId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
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
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
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

  async bookSession(sessionId: string, learnerId: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session not found');
    if (session.status !== 'PENDING') throw new ValidationError('Session is not available for booking');
    if (session.learnerId) throw new ValidationError('Session is already booked');
    if (session.mentorId === learnerId) throw new ValidationError('Mentors cannot book their own sessions');

    return prisma.session.update({
      where: { id: sessionId },
      data: { learnerId, status: 'SCHEDULED' },
      include: SESSION_INCLUDE,
    });
  }

  async updateSessionStatus(
    sessionId: string,
    userId: string,
    userRole: Role,
    dto: UpdateSessionStatusDto,
  ) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
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

    return prisma.session.update({
      where: { id: sessionId },
      data: { status: dto.status as SessionStatus },
      include: SESSION_INCLUDE,
    });
  }

  async addFeedback(sessionId: string, learnerId: string, dto: CreateFeedbackDto) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { feedback: true },
    });
    if (!session) throw new NotFoundError('Session not found');
    if (session.learnerId !== learnerId) throw new ForbiddenError('Only the learner can leave feedback');
    if (session.status !== 'COMPLETED') throw new ValidationError('Session must be completed to leave feedback');
    if (session.feedback) throw new ValidationError('Feedback already submitted for this session');

    return prisma.feedback.create({
      data: { sessionId, learnerId, ...dto },
      include: { session: { select: { id: true, title: true } } },
    });
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
      prisma.session.count({ where: { mentorId } }),
      prisma.session.groupBy({
        by: ['status'],
        where: { mentorId },
        _count: { status: true },
      }),
      prisma.feedback.aggregate({
        where: { session: { mentorId } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return { total, byStatus, avgRating };
  }
}

export const sessionService = new SessionService();
