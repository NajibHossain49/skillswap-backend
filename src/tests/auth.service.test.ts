import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../modules/auth/auth.service';
import { prisma } from '../prisma/client';
import bcrypt from 'bcrypt';
import { ConflictError, UnauthorizedError } from '../utils/errors';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  bio: null,
  role: 'LEARNER' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Test@1234',
      name: 'Test User',
      role: 'LEARNER' as const,
    };

    it('should register a new user successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockUser,
        password: 'hashed',
      } as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await authService.register(registerDto);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(prisma.user.create).toHaveBeenCalledOnce();
    });

    it('should throw ConflictError if email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: 'hashed',
      } as any);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Test@1234' };

    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      } as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await authService.login(loginDto);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('WrongPass', 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      } as any);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for inactive user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        isActive: false,
        password: 'hash',
      } as any);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
    });
  });
});
