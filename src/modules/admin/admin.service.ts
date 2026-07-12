import { Prisma, MentorStatus, ReportStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { notDeleted } from '../../utils/prisma-filters';
import { cache, CacheKeys, DEFAULT_TTL_MS } from '../../utils/cache';
import { AuditLogQueryDto } from './admin.schema';

export class AdminService {
  async getDashboardStats() {
    return cache.wrap(CacheKeys.adminDashboard, DEFAULT_TTL_MS, () => this.computeDashboardStats());
  }

  private async computeDashboardStats() {
    const [
      totalUsers,
      usersByRole,
      totalSkills,
      totalSessions,
      sessionsByStatus,
      recentUsers,
      recentSessions,
      avgRating,
      openReports,
      pendingMentorApplications,
      creditsInCirculation,
      signupTrend,
    ] = await Promise.all([
      prisma.user.count({ where: { ...notDeleted } }),
      prisma.user.groupBy({ by: ['role'], where: { ...notDeleted }, _count: { role: true } }),
      prisma.skill.count({ where: { ...notDeleted, isActive: true } }),
      prisma.session.count({ where: { ...notDeleted } }),
      prisma.session.groupBy({ by: ['status'], where: { ...notDeleted }, _count: { status: true } }),
      prisma.user.findMany({
        where: { ...notDeleted },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.session.findMany({
        where: { ...notDeleted },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          mentor: { select: { id: true, name: true } },
          skill: { select: { id: true, title: true } },
        },
      }),
      prisma.feedback.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
      prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      prisma.user.count({ where: { ...notDeleted, mentorStatus: MentorStatus.PENDING } }),
      prisma.user.aggregate({ where: { ...notDeleted }, _sum: { creditBalance: true } }),
      this.getSignupTrend(7),
    ]);

    return {
      users: { total: totalUsers, byRole: usersByRole },
      skills: { total: totalSkills },
      sessions: { total: totalSessions, byStatus: sessionsByStatus },
      feedback: { avgRating: avgRating._avg.rating, totalReviews: avgRating._count.rating },
      moderation: {
        openReports,
        pendingMentorApplications,
      },
      credits: { inCirculation: creditsInCirculation._sum.creditBalance ?? 0 },
      signupTrend,
      recent: { users: recentUsers, sessions: recentSessions },
    };
  }

  /**
   * Daily signup counts for the last `days` days (oldest → newest), with empty
   * days filled with 0 so the frontend Recharts line has a continuous series.
   */
  private async getSignupTrend(days: number): Promise<Array<{ date: string; count: number }>> {
    const rows = await prisma.$queryRaw<Array<{ day: string; count: number }>>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM "users"
      WHERE "createdAt" >= NOW() - make_interval(days => ${days - 1})
        AND "deletedAt" IS NULL
      GROUP BY 1
    `;

    const counts = new Map(rows.map((r) => [r.day, Number(r.count)]));

    const series: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return series;
  }

  async getPlatformActivity(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [newUsers, newSessions, completedSessions] = await Promise.all([
      prisma.user.count({ where: { ...notDeleted, createdAt: { gte: since } } }),
      prisma.session.count({ where: { ...notDeleted, createdAt: { gte: since } } }),
      prisma.session.count({
        where: { ...notDeleted, status: 'COMPLETED', updatedAt: { gte: since } },
      }),
    ]);

    return { period: `${days} days`, newUsers, newSessions, completedSessions };
  }

  async getAuditLogs(query: AuditLogQueryDto) {
    const { page, limit, actorId, entity } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(actorId && { actorId }),
      ...(entity && { entity }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const adminService = new AdminService();
