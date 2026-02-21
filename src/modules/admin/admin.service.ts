import { prisma } from '../../prisma/client';

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      usersByRole,
      totalSkills,
      totalSessions,
      sessionsByStatus,
      recentUsers,
      recentSessions,
      avgRating,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
      prisma.skill.count({ where: { isActive: true } }),
      prisma.session.count(),
      prisma.session.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.session.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          mentor: { select: { id: true, name: true } },
          skill: { select: { id: true, title: true } },
        },
      }),
      prisma.feedback.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
    ]);

    return {
      users: { total: totalUsers, byRole: usersByRole },
      skills: { total: totalSkills },
      sessions: { total: totalSessions, byStatus: sessionsByStatus },
      feedback: { avgRating: avgRating._avg.rating, totalReviews: avgRating._count.rating },
      recent: { users: recentUsers, sessions: recentSessions },
    };
  }

  async getPlatformActivity(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [newUsers, newSessions, completedSessions] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.session.count({ where: { createdAt: { gte: since } } }),
      prisma.session.count({ where: { status: 'COMPLETED', updatedAt: { gte: since } } }),
    ]);

    return { period: `${days} days`, newUsers, newSessions, completedSessions };
  }
}

export const adminService = new AdminService();
