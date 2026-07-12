import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../modules/auth/auth.service';
import { prisma } from '../prisma/client';
import bcrypt from 'bcrypt';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { hashToken } from '../utils/crypto';
import { generateRefreshToken } from '../utils/jwt';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  bio: null,
  role: 'LEARNER' as const,
  isActive: true,
  tokenVersion: 0,
  isEmailVerified: false,
  avatarUrl: null,
  deletedAt: null,
  lastLoginAt: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
    // Sensible defaults so happy-path writes resolve.
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
    vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as never);
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.verificationToken.create).mockResolvedValue({} as never);
    vi.mocked(prisma.verificationToken.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
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
      } as never);

      const result = await authService.register(registerDto);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(prisma.user.create).toHaveBeenCalledOnce();
    });

    it('should create an email verification token on register', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockUser,
        password: 'hashed',
      } as never);

      await authService.register(registerDto);

      expect(prisma.verificationToken.create).toHaveBeenCalledOnce();
      const arg = vi.mocked(prisma.verificationToken.create).mock.calls[0][0];
      expect(arg.data.type).toBe('EMAIL_VERIFICATION');
      expect(arg.data.userId).toBe('user-123');
    });

    it('should never expose the password hash in the returned user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockUser,
        password: 'hashed',
      } as never);

      const result = await authService.register(registerDto);
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('tokenVersion');
      expect(result.user).not.toHaveProperty('failedLoginAttempts');
    });

    it('should throw ConflictError if email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: 'hashed',
      } as never);

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
      } as never);

      const result = await authService.login(loginDto);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should store the refresh token as a SHA-256 hash, never the raw JWT', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      } as never);

      const result = await authService.login(loginDto);
      const createArg = vi.mocked(prisma.refreshToken.create).mock.calls[0][0];

      expect(createArg.data.tokenHash).toBe(hashToken(result.refreshToken));
      expect(createArg.data.tokenHash).not.toBe(result.refreshToken);
      expect(createArg.data.familyId).toBeTruthy();
    });

    it('should reset the lockout counter and set lastLoginAt on success', async () => {
      const hashedPassword = await bcrypt.hash('Test@1234', 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        failedLoginAttempts: 3,
      } as never);

      await authService.login(loginDto);
      const updateArg = vi.mocked(prisma.user.update).mock.calls[0][0];
      expect(updateArg.data.failedLoginAttempts).toBe(0);
      expect(updateArg.data.lockedUntil).toBeNull();
      expect(updateArg.data.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('WrongPass', 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      } as never);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for non-existent user (with uniform timing)', async () => {
      const compareSpy = vi.spyOn(bcrypt, 'compare');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
      // bcrypt.compare must still run against the dummy hash to keep timing uniform.
      expect(compareSpy).toHaveBeenCalledOnce();
      compareSpy.mockRestore();
    });

    it('should throw UnauthorizedError for inactive user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        isActive: false,
        password: 'hash',
      } as never);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
    });

    it('should lock the account after 5 consecutive failed attempts', async () => {
      const hashedPassword = await bcrypt.hash('Correct@123', 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        failedLoginAttempts: 4,
      } as never);

      await expect(
        authService.login({ email: mockUser.email, password: 'Wrong@123' }),
      ).rejects.toThrow(UnauthorizedError);

      const updateArg = vi.mocked(prisma.user.update).mock.calls[0][0];
      expect(updateArg.data.failedLoginAttempts).toBe(5);
      expect(updateArg.data.lockedUntil).toBeInstanceOf(Date);
    });

    it('should reject login while the account is locked', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60_000),
      } as never);

      await expect(authService.login(loginDto)).rejects.toThrow(/locked/i);
    });
  });

  describe('refresh - reuse detection', () => {
    it('should revoke the entire family and bump tokenVersion when a revoked token is replayed', async () => {
      const refreshToken = generateRefreshToken({
        sub: 'user-123',
        email: mockUser.email,
        role: mockUser.role,
        tokenVersion: 0,
      });

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'rt-1',
        tokenHash: hashToken(refreshToken),
        userId: 'user-123',
        familyId: 'fam-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 100_000),
      } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        tokenVersion: 0,
      } as never);

      await expect(authService.refresh(refreshToken)).rejects.toThrow(
        'Session revoked for security reasons',
      );

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'fam-1', isRevoked: false },
        data: { isRevoked: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { tokenVersion: { increment: 1 } },
      });
    });

    it('should rotate the token within the same family on a valid refresh', async () => {
      const refreshToken = generateRefreshToken({
        sub: 'user-123',
        email: mockUser.email,
        role: mockUser.role,
        tokenVersion: 0,
      });

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'rt-1',
        tokenHash: hashToken(refreshToken),
        userId: 'user-123',
        familyId: 'fam-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100_000),
      } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        tokenVersion: 0,
      } as never);

      const result = await authService.refresh(refreshToken);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      // Old token revoked, new token created in the same family.
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
      const createArg = vi.mocked(prisma.refreshToken.create).mock.calls[0][0];
      expect(createArg.data.familyId).toBe('fam-1');
    });
  });

  describe('resetPassword', () => {
    it('should reset the password, mark the token used, and revoke all refresh tokens', async () => {
      const rawToken = 'raw-reset-token';
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        id: 'vt-1',
        tokenHash: hashToken(rawToken),
        userId: 'user-123',
        type: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100_000),
      } as never);

      const result = await authService.resetPassword(rawToken, 'NewPass@123');

      expect(result.message).toBe('Password reset successful');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
      });
      expect(prisma.verificationToken.update).toHaveBeenCalledWith({
        where: { id: 'vt-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should reject an invalid, expired, or already-used reset token', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null);
      await expect(authService.resetPassword('bad-token', 'NewPass@123')).rejects.toThrow(
        UnauthorizedError,
      );

      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        id: 'vt-1',
        tokenHash: hashToken('used-token'),
        userId: 'user-123',
        type: 'PASSWORD_RESET',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 100_000),
      } as never);
      await expect(authService.resetPassword('used-token', 'NewPass@123')).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return a generic message and not create a token for unknown emails', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const result = await authService.forgotPassword('nobody@example.com');
      expect(result.message).toMatch(/if an account/i);
      expect(prisma.verificationToken.create).not.toHaveBeenCalled();
    });

    it('should create a reset token for a known active user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      await authService.forgotPassword(mockUser.email);
      const arg = vi.mocked(prisma.verificationToken.create).mock.calls[0][0];
      expect(arg.data.type).toBe('PASSWORD_RESET');
    });
  });
});
