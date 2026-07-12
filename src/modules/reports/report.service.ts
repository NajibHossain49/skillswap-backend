import { Prisma, ReportStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { CreateReportDto, ReportQueryDto, ResolveReportDto } from './report.schema';

export class ReportService {
  async createReport(reporterId: string, dto: CreateReportDto) {
    if (dto.reportedUserId && dto.reportedUserId === reporterId) {
      throw new ValidationError('You cannot report yourself');
    }

    return prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId ?? null,
        sessionId: dto.sessionId ?? null,
        skillId: dto.skillId ?? null,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }

  async getReports(query: ReportQueryDto) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {
      ...(status && { status }),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReportById(id: string) {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundError('Report not found');
    return report;
  }

  async resolveReport(id: string, adminId: string, dto: ResolveReportDto) {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundError('Report not found');

    // RESOLVED and DISMISSED are terminal outcomes; UNDER_REVIEW just claims it.
    const isTerminal = dto.status === ReportStatus.RESOLVED || dto.status === ReportStatus.DISMISSED;

    return prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote ?? report.adminNote,
        resolvedById: adminId,
        resolvedAt: isTerminal ? new Date() : null,
      },
    });
  }
}

export const reportService = new ReportService();
