import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { NotFoundError } from '../../utils/errors';
import { MentorQueryDto, MentorReviewsQueryDto } from './mentor.schema';

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
    where: { isActive: true },
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
      mentors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMentorById(mentorId: string) {
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, role: Role.MENTOR, isActive: true, deletedAt: null },
      select: MENTOR_PUBLIC_SELECT,
    });
    if (!mentor) throw new NotFoundError('Mentor not found');

    const recentReviews = await prisma.feedback.findMany({
      where: { session: { mentorId } },
      select: REVIEW_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return { ...mentor, recentReviews };
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
}

export const mentorService = new MentorService();
