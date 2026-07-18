import { Prisma, Role, MentorStatus, NotificationType } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';
import { notDeleted } from '../../utils/prisma-filters';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { notificationService } from '../../services/notification.service';
import {
  MentorQueryDto,
  MentorReviewsQueryDto,
  ApplyMentorDto,
  MentorApplicationQueryDto,
  ReviewApplicationDto,
} from './mentor.schema';

// Fields returned when an admin reviews mentor applications.
const APPLICATION_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  bio: true,
  headline: true,
  location: true,
  mentorStatus: true,
  mentorExperience: true,
  mentorLinkedinUrl: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Public projection of a mentor — deliberately omits email, password and every
// other sensitive/internal field.
const MENTOR_PUBLIC_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  headline: true,
  bio: true,
  location: true,
  ratingAvg: true,
  ratingCount: true,
  totalSessionsTaught: true,
  createdSkills: {
    where: { isActive: true, deletedAt: null },
    select: { id: true, title: true, category: true, level: true },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.UserSelect;

const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  learner: { select: { id: true, name: true, avatarUrl: true } },
  session: { select: { id: true, title: true, skill: { select: { id: true, title: true } } } },
} satisfies Prisma.FeedbackSelect;

export class MentorService {
  private baseWhere(query?: Partial<MentorQueryDto>): Prisma.UserWhereInput {
    return {
      role: Role.MENTOR,
      isActive: true,
      deletedAt: null,
      ...(query?.category && {
        createdSkills: {
          some: {
            isActive: true,
            deletedAt: null,
            category: { equals: query.category, mode: 'insensitive' },
          },
        },
      }),
      ...(query?.minRating !== undefined && { ratingAvg: { gte: query.minRating } }),
      ...(query?.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { headline: { contains: query.search, mode: 'insensitive' } },
          { bio: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  async getMentors(query: MentorQueryDto) {
    const { page, limit, sortBy } = query;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.UserOrderByWithRelationInput =
      sortBy === 'sessions'
        ? { totalSessionsTaught: 'desc' }
        : sortBy === 'newest'
          ? { createdAt: 'desc' }
          : { ratingAvg: 'desc' };

    const where = this.baseWhere(query);

    const [mentors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: MENTOR_PUBLIC_SELECT,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      // Expose the relation as `skills` publicly; `createdSkills` is an internal
      // Prisma relation name and must not leak into the public API contract.
      mentors: mentors.map(({ createdSkills, ...mentor }) => ({ ...mentor, skills: createdSkills })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMentorById(mentorId: string) {
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: Role.MENTOR, isActive: true, deletedAt: null },
      select: { ...MENTOR_PUBLIC_SELECT, createdAt: true },
    });
    if (!mentor) throw new NotFoundError('Mentor not found');

    const recentReviews = await prisma.feedback.findMany({
      where: { session: { mentorId } },
      select: REVIEW_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const { createdSkills, ...rest } = mentor;
    return { ...rest, skills: createdSkills, recentReviews };
  }

  async getMentorReviews(mentorId: string, query: MentorReviewsQueryDto) {
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: Role.MENTOR, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!mentor) throw new NotFoundError('Mentor not found');

    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.FeedbackWhereInput = { session: { mentorId } };

    const [reviews, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        select: REVIEW_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.count({ where }),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async applyAsMentor(userId: string, dto: ApplyMentorDto) {
    const user = await prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
      select: { id: true, role: true, mentorStatus: true },
    });
    if (!user) throw new NotFoundError('User not found');
    if (user.role === Role.ADMIN) {
      throw new ValidationError('Admins do not need to apply as mentors');
    }
    if (user.mentorStatus === MentorStatus.PENDING) {
      throw new ConflictError('You already have a pending mentor application');
    }
    if (user.mentorStatus === MentorStatus.APPROVED) {
      throw new ConflictError('You are already an approved mentor');
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        headline: dto.headline,
        mentorExperience: dto.experience,
        mentorLinkedinUrl: dto.linkedinUrl ?? null,
        mentorStatus: MentorStatus.PENDING,
      },
      select: APPLICATION_SELECT,
    });
  }

  async getMentorApplications(query: MentorApplicationQueryDto) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { ...notDeleted, mentorStatus: status };

    const [applications, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: APPLICATION_SELECT,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      applications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async reviewMentorApplication(userId: string, dto: ReviewApplicationDto) {
    const user = await prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
      select: { id: true, name: true, mentorStatus: true },
    });
    if (!user) throw new NotFoundError('User not found');
    if (user.mentorStatus !== MentorStatus.PENDING) {
      throw new ValidationError('This user has no pending mentor application');
    }

    const approved = dto.status === 'APPROVED';

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        mentorStatus: approved ? MentorStatus.APPROVED : MentorStatus.REJECTED,
        ...(approved && { role: Role.MENTOR }),
      },
      select: APPLICATION_SELECT,
    });

    const link = `${config.appUrl}/dashboard`;
    void notificationService
      .notify({
        userId,
        type: approved ? NotificationType.MENTOR_APPROVED : NotificationType.SYSTEM,
        title: approved ? 'Mentor application approved' : 'Mentor application declined',
        body: approved
          ? 'Congratulations! You can now create skills and host sessions.'
          : `Your mentor application was not approved.${dto.note ? ` Note: ${dto.note}` : ''}`,
        link,
        metadata: { mentorStatus: updated.mentorStatus, note: dto.note ?? null },
      })
      .catch((err) => logger.error({ msg: 'Failed to send mentor application notification', err }));

    return updated;
  }
}

export const mentorService = new MentorService();
