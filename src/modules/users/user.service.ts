import { prisma } from '../../prisma/client';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { UpdateProfileDto, UpdateUserRoleDto, UserQueryDto } from './user.schema';
import { Role } from '@prisma/client';

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
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
      ...(role && { role: role as Role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: USER_SELECT, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateUserRole(targetUserId: string, dto: UpdateUserRoleDto) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role as Role },
      select: USER_SELECT,
    });
  }

  async deactivateUser(targetUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
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
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: true },
      select: USER_SELECT,
    });
  }

  async deleteUser(targetUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError('User not found');

    await prisma.user.delete({ where: { id: targetUserId } });
    return { message: 'User deleted successfully' };
  }
}

export const userService = new UserService();
