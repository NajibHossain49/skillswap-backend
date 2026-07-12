import { Role, TokenType, CreditTxnType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../prisma/client';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { hashToken, generateSecureToken } from '../../utils/crypto';
import { sendEmail, verificationEmail, passwordResetEmail } from '../../services/email.service';
import { creditService } from '../../services/credit.service';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from '../../utils/jwt';
import { LoginDto, RegisterDto } from './auth.schema';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const STARTER_CREDITS = 3;

// Precomputed hash compared against when a user does not exist so that login
// timing is uniform and cannot be used to enumerate which emails are registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'dummy-password-for-uniform-timing',
  config.bcryptRounds,
);

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

interface TokenUser {
  id: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

const toSafeUser = (user: {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  bio: user.bio,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  avatarUrl: user.avatarUrl,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class AuthService {
  private async issueTokens(
    user: TokenUser,
    familyId: string,
    context: RequestContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        familyId,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { accessToken, refreshToken };
  }

  private async createVerificationToken(
    userId: string,
    type: TokenType,
    ttlMs: number,
  ): Promise<string> {
    const rawToken = generateSecureToken();
    await prisma.verificationToken.create({
      data: {
        tokenHash: hashToken(rawToken),
        userId,
        type,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return rawToken;
  }

  async register(dto: RegisterDto, context: RequestContext = {}) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, config.bcryptRounds);

    // Create the account and grant the starter credits through the same atomic
    // ledger primitive so the balance and the transaction history stay in sync
    // from the very first credit.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          bio: dto.bio,
          role: dto.role as Role,
          creditBalance: 0,
        },
      });

      await creditService.transfer(
        {
          userId: created.id,
          amount: STARTER_CREDITS,
          type: CreditTxnType.SIGNUP_BONUS,
          description: 'Welcome bonus: 3 starter credits',
        },
        tx,
      );

      return created;
    });

    const familyId = uuidv4();
    const { accessToken, refreshToken } = await this.issueTokens(user, familyId, context);

    const rawToken = await this.createVerificationToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TTL_MS,
    );
    const verifyLink = `${config.appUrl}/verify-email?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your SkillSwap email',
      html: verificationEmail(user.name, verifyLink),
    });

    return { user: toSafeUser(user), accessToken, refreshToken };
  }

  async login(dto: LoginDto, context: RequestContext = {}) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });

    // Always run a bcrypt comparison, even when the user is missing, so response
    // timing does not leak whether the email is registered.
    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError(
        'Account temporarily locked due to too many failed login attempts',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : user.lockedUntil,
        },
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Successful login — reset lockout state and record the timestamp.
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const familyId = uuidv4();
    const { accessToken, refreshToken } = await this.issueTokens(user, familyId, context);

    return { user: toSafeUser(user), accessToken, refreshToken };
  }

  async refresh(refreshToken: string, context: RequestContext = {}) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // A stale token version means the session was already invalidated (password
    // change / global revoke). Reject it without nuking the family.
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Reuse detection: replaying an already-revoked token indicates theft, so
    // burn the entire family and bump the token version to invalidate access tokens.
    if (stored.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, isRevoked: false },
        data: { isRevoked: true },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
      logger.warn({
        msg: 'Refresh token reuse detected — revoking token family',
        userId: user.id,
        familyId: stored.familyId,
      });
      throw new UnauthorizedError('Session revoked for security reasons');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke the presented token and issue a new pair in the same family.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const tokens = await this.issueTokens(user, stored.familyId, context);
    return tokens;
  }

  async logout(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (stored) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { isRevoked: true },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Logged out from all devices' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    context: RequestContext = {},
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, config.bcryptRounds);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    });

    // Invalidate every existing session.
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    const familyId = uuidv4();
    const tokens = await this.issueTokens(updated, familyId, context);
    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Only send when the account exists, but always return the same response so
    // the endpoint cannot be used to enumerate registered emails.
    if (user && user.isActive) {
      const rawToken = await this.createVerificationToken(
        user.id,
        TokenType.PASSWORD_RESET,
        PASSWORD_RESET_TTL_MS,
      );
      const resetLink = `${config.appUrl}/reset-password?token=${rawToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Reset your SkillSwap password',
        html: passwordResetEmail(user.name, resetLink),
      });
    }

    return { message: 'If an account with that email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (
      !record ||
      record.type !== TokenType.PASSWORD_RESET ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, config.bcryptRounds);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    });

    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // Invalidate every existing session.
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Password reset successful' };
  }

  async verifyEmail(token: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (
      !record ||
      record.type !== TokenType.EMAIL_VERIFICATION ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    });

    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const rawToken = await this.createVerificationToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TTL_MS,
    );
    const verifyLink = `${config.appUrl}/verify-email?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your SkillSwap email',
      html: verificationEmail(user.name, verifyLink),
    });

    return { message: 'Verification email sent' };
  }

  async listSessions(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!stored || stored.userId !== userId) {
      throw new NotFoundError('Session not found');
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    return { message: 'Session revoked' };
  }
}

export const authService = new AuthService();
