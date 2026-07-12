import { Role } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userService } from '../modules/users/user.service';
import { NotFoundError } from '../utils/errors';
import { prisma } from '../prisma/client';

const mockPrisma = prisma as any;

// Prism is fully mocked (including deep nested methods)
vi.mock('../prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

// I copied USER_SELECT (from service)
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  bio: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const mockUser = {
  id: 'u-123',
  email: 'user@example.com',
  name: 'Regular User',
  bio: 'I like learning',
  role: Role.LEARNER,
  isActive: true,
//   password: 'some_password_value',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-02-01'),
};

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ────────────────────────────────────────────────
  // getProfile
  // ────────────────────────────────────────────────
  describe('getProfile', () => {
    it('returns selected fields when user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userService.getProfile('u-123');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'u-123', deletedAt: null },
        select: USER_SELECT,
      });
    });

    it('throws NotFoundError when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.getProfile('ghost')).rejects.toThrow(
        new NotFoundError('User not found'),
      );
    });
  });

  // ────────────────────────────────────────────────
  // updateProfile
  // ────────────────────────────────────────────────
  describe('updateProfile', () => {
    const updateData = { name: 'New Name', bio: 'Updated bio' };

    it('updates user and returns new data', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, ...updateData });

      const result = await userService.updateProfile('u-123', updateData);

      expect(result.name).toBe('New Name');
      expect(result.bio).toBe('Updated bio');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-123' },
        data: updateData,
        select: USER_SELECT,
      });
    });

    it('throws NotFound when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.updateProfile('ghost', updateData)).rejects.toThrow(NotFoundError);
    });

    it('allows partial update (only name)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, name: 'Only Name' });

      const result = await userService.updateProfile('u-123', { name: 'Only Name' });

      expect(result.name).toBe('Only Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Only Name' } }),
      );
    });
  });

  // ────────────────────────────────────────────────
  // getAllUsers
  // ────────────────────────────────────────────────
  describe('getAllUsers', () => {
    const defaultQuery = { page: 1, limit: 10 };

    it('returns paginated result with default params', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'u-124' }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(15);

      const result = await userService.getAllUsers(defaultQuery);

      expect(result.users).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('applies role filter when provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await userService.getAllUsers({ ...defaultQuery, role: 'MENTOR' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, role: 'MENTOR' },
        }),
      );
    });

    it('applies search filter on name & email (case insensitive)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await userService.getAllUsers({ ...defaultQuery, search: 'exa' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: 'exa', mode: 'insensitive' } },
              { email: { contains: 'exa', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('combines role + search filters', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await userService.getAllUsers({ page: 2, limit: 20, role: 'ADMIN', search: 'john' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            role: 'ADMIN',
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          },
          skip: 20,
          take: 20,
        }),
      );
    });

    it('handles page=1 limit=1 correctly', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(100);

      const result = await userService.getAllUsers({ page: 1, limit: 1 });

      expect(result.pagination.totalPages).toBe(100);
    });

    it('handles empty result set', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await userService.getAllUsers(defaultQuery);

      expect(result.users).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  // ────────────────────────────────────────────────
  // getUserById
  // ────────────────────────────────────────────────
  describe('getUserById', () => {
    it('returns user when exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userService.getUserById('u-123');

      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundError when user missing', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.getUserById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  // ────────────────────────────────────────────────
  // updateUserRole
  // ────────────────────────────────────────────────
  describe('updateUserRole', () => {
    it('updates role successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, role: Role.MENTOR });

      const result = await userService.updateUserRole('u-123', { role: 'MENTOR' });

      expect(result.role).toBe(Role.MENTOR);
    });

    it('throws when target user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.updateUserRole('ghost', { role: 'ADMIN' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // ────────────────────────────────────────────────
  // deactivateUser
  // ────────────────────────────────────────────────
  describe('deactivateUser', () => {
    it('sets isActive=false and revokes all active refresh tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 4 });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await userService.deactivateUser('u-123');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-123', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('still succeeds even if no refresh tokens exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await userService.deactivateUser('u-123');

      expect(result.isActive).toBe(false);
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.deactivateUser('ghost')).rejects.toThrow(NotFoundError);
    });
  });

  // ────────────────────────────────────────────────
  // activateUser
  // ────────────────────────────────────────────────
  describe('activateUser', () => {
    it('sets isActive=true', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findFirst.mockResolvedValue(inactiveUser);
      mockPrisma.user.update.mockResolvedValue({ ...inactiveUser, isActive: true });

      const result = await userService.activateUser('u-123');

      expect(result.isActive).toBe(true);
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.activateUser('ghost')).rejects.toThrow(NotFoundError);
    });
  });

  // ────────────────────────────────────────────────
  // deleteUser
  // ────────────────────────────────────────────────
  describe('deleteUser', () => {
    it('soft-deletes: sets deletedAt, deactivates, anonymizes email, blanks bio, revokes tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.update.mockResolvedValue({} as any);

      const result = await userService.deleteUser('u-123');

      expect(result).toEqual({ message: 'User deleted successfully' });

      // Never a hard delete — that would violate the required Session.mentorId FK.
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-123', isRevoked: false },
        data: { isRevoked: true },
      });

      const updateArg = mockPrisma.user.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'u-123' });
      expect(updateArg.data.isActive).toBe(false);
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArg.data.bio).toBeNull();
      expect(updateArg.data.email).toMatch(/^deleted-.+@skillswap\.local$/);
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.deleteUser('ghost')).rejects.toThrow(NotFoundError);
    });
  });
});
