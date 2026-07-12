import bcrypt from 'bcrypt';
import { describe } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { Role, MentorStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { generateAccessToken } from '../../utils/jwt';

// Only run when explicitly enabled (a real DB is required). Minimal callable type
// so both `describe` and `describe.skip` assign cleanly.
type SuiteFn = (name: string, fn: () => void) => void;
export const describeIntegration: SuiteFn = process.env.RUN_INTEGRATION
  ? describe
  : describe.skip;

// Every row created via these helpers is tracked so it can be removed after a run
// without truncating shared tables.
const createdUserIds = new Set<string>();

export const uniqueEmail = (prefix = 'it'): string =>
  `${prefix}-${uuidv4()}@skillswap.test`;

interface CreateUserOpts {
  role?: Role;
  mentorStatus?: MentorStatus;
  password?: string;
  creditBalance?: number;
  isActive?: boolean;
  email?: string;
}

export async function createUser(opts: CreateUserOpts = {}) {
  const password = opts.password ?? 'Password123!';
  // Low cost — these hashes are throwaway; keeps the suite fast.
  const hashed = await bcrypt.hash(password, 4);
  const user = await prisma.user.create({
    data: {
      email: opts.email ?? uniqueEmail(),
      password: hashed,
      name: 'Integration User',
      role: opts.role ?? Role.LEARNER,
      mentorStatus: opts.mentorStatus ?? MentorStatus.NONE,
      creditBalance: opts.creditBalance ?? 3,
      isActive: opts.isActive ?? true,
    },
  });
  createdUserIds.add(user.id);
  return { user, password };
}

export function tokenFor(user: { id: string; email: string; role: Role; tokenVersion?: number }): string {
  return generateAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });
}

export function trackUserId(id: string): void {
  createdUserIds.add(id);
}

export async function trackUserByEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) createdUserIds.add(user.id);
}

/**
 * Delete everything created during the run, in FK-safe order. Only touches rows
 * tied to tracked users.
 */
export async function cleanupAll(): Promise<void> {
  const ids = [...createdUserIds];
  if (ids.length === 0) return;

  await prisma.feedback.deleteMany({
    where: {
      OR: [
        { learnerId: { in: ids } },
        { session: { OR: [{ mentorId: { in: ids } }, { learnerId: { in: ids } }] } },
      ],
    },
  });
  await prisma.creditTransaction.deleteMany({ where: { userId: { in: ids } } });
  await prisma.bookingRequest.deleteMany({
    where: { OR: [{ learnerId: { in: ids } }, { mentorId: { in: ids } }] },
  });
  await prisma.session.deleteMany({
    where: { OR: [{ mentorId: { in: ids } }, { learnerId: { in: ids } }] },
  });
  await prisma.skill.deleteMany({ where: { createdById: { in: ids } } });
  await prisma.report.deleteMany({
    where: { OR: [{ reporterId: { in: ids } }, { reportedUserId: { in: ids } }] },
  });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.verificationToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.availability.deleteMany({ where: { mentorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  createdUserIds.clear();
}
