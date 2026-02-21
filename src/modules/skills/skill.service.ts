import { prisma } from '../../prisma/client';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { CreateSkillDto, UpdateSkillDto, SkillQueryDto } from './skill.schema';
import { Role } from '@prisma/client';

export class SkillService {
  async createSkill(userId: string, dto: CreateSkillDto) {
    return prisma.skill.create({
      data: { ...dto, createdById: userId },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async getAllSkills(query: SkillQueryDto) {
    const { page, limit, category, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      ...(category && { category: { equals: category, mode: 'insensitive' as const } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.skill.count({ where }),
    ]);

    return {
      skills,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSkillById(skillId: string) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { sessions: true } },
      },
    });
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  }

  async updateSkill(skillId: string, userId: string, userRole: Role, dto: UpdateSkillDto) {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || !skill.isActive) throw new NotFoundError('Skill not found');

    if (userRole !== 'ADMIN' && skill.createdById !== userId) {
      throw new ForbiddenError('You can only update your own skills');
    }

    return prisma.skill.update({
      where: { id: skillId },
      data: dto,
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async deleteSkill(skillId: string, userId: string, userRole: Role) {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || !skill.isActive) throw new NotFoundError('Skill not found');

    if (userRole !== 'ADMIN' && skill.createdById !== userId) {
      throw new ForbiddenError('You can only delete your own skills');
    }

    return prisma.skill.update({
      where: { id: skillId },
      data: { isActive: false },
    });
  }

  async getCategories() {
    const categories = await prisma.skill.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return categories.map((c) => c.category);
  }
}

export const skillService = new SkillService();
