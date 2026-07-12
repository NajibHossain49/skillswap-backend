import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../prisma/client';
import { NotFoundError } from '../../utils/errors';
import { notDeleted } from '../../utils/prisma-filters';
import { UpdateProfileDto, UpdateUserRoleDto, UserQueryDto } from './user.schema';

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

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await prisma.user.findFirst({ where: { id: userId, ...notDeleted } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: userId },
      data: dto,
      select: USER_SELECT,
    });
  }

  async getAllUsers(query: UserQueryDto) {
    const { page, limit, role, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...notDeleted,
      ...(role && { role: role as Role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateUserRole(targetUserId: string, dto: UpdateUserRoleDto) {
    const user = await prisma.user.findFirst({ where: { id: targetUserId, ...notDeleted } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role as Role },
      select: USER_SELECT,
    });
  }

  async deactivateUser(targetUserId: string) {
    const user = await prisma.user.findFirst({ where: { id: targetUserId, ...notDeleted } });
    if (!user) throw new NotFoundError('User not found');

    await prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });

    return prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  async activateUser(targetUserId: string) {
    const user = await prisma.user.findFirst({ where: { id: targetUserId, ...notDeleted } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: true },
      select: USER_SELECT,
    });
  }

  /**
   * Soft delete. A hard delete throws Prisma P2003 because Session.mentorId is a
   * required FK (and would erase session history anyway). Instead we mark the row
   * deleted, deactivate it, revoke sessions, anonymize the email so the original
   * address can be reused, and blank the bio. Sessions stay intact.
   */
  async deleteUser(targetUserId: string) {
    const user = await prisma.user.findFirst({ where: { id: targetUserId, ...notDeleted } });
    if (!user) throw new NotFoundError('User not found');

    await prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        email: `deleted-${uuidv4()}@skillswap.local`,
        bio: null,
        // Bump the token version so any outstanding access tokens are rejected.
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'User deleted successfully' };
  }
}

export const userService = new UserService();
