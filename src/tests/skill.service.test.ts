import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillService } from '../modules/skills/skill.service';
import { prisma } from '../prisma/client';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { Role } from '@prisma/client';

const mockSkill = {
  id: 'skill-123',
  title: 'TypeScript',
  description: 'Learn TypeScript from scratch to advanced',
  category: 'Programming',
  createdById: 'user-123',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SkillService', () => {
  let skillService: SkillService;

  beforeEach(() => {
    skillService = new SkillService();
    vi.clearAllMocks();
  });

  describe('createSkill', () => {
    it('should create a skill successfully', async () => {
      vi.mocked(prisma.skill.create).mockResolvedValue({
        ...mockSkill,
        createdBy: { id: 'user-123', name: 'Jane', email: 'jane@test.com' },
      } as any);

      const result = await skillService.createSkill('user-123', {
        title: 'TypeScript',
        description: 'Learn TypeScript from scratch to advanced',
        category: 'Programming',
      });

      expect(result).toBeDefined();
      expect(prisma.skill.create).toHaveBeenCalledOnce();
    });
  });

  describe('getSkillById', () => {
    it('should return a skill when found', async () => {
      vi.mocked(prisma.skill.findUnique).mockResolvedValue({
        ...mockSkill,
        createdBy: { id: 'user-123', name: 'Jane', email: 'jane@test.com' },
        _count: { sessions: 2 },
      } as any);

      const result = await skillService.getSkillById('skill-123');
      expect(result.id).toBe('skill-123');
    });

    it('should throw NotFoundError when skill not found', async () => {
      vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
      await expect(skillService.getSkillById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateSkill', () => {
    it('should allow admin to update any skill', async () => {
      vi.mocked(prisma.skill.findUnique).mockResolvedValue(mockSkill as any);
      vi.mocked(prisma.skill.update).mockResolvedValue({ ...mockSkill, title: 'Updated' } as any);

      const result = await skillService.updateSkill(
        'skill-123',
        'different-user',
        'ADMIN' as Role,
        { title: 'Updated' },
      );

      expect(prisma.skill.update).toHaveBeenCalledOnce();
    });

    it('should throw ForbiddenError when mentor tries to update another mentor\'s skill', async () => {
      vi.mocked(prisma.skill.findUnique).mockResolvedValue(mockSkill as any);

      await expect(
        skillService.updateSkill('skill-123', 'different-user', 'MENTOR' as Role, {
          title: 'Hack',
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
