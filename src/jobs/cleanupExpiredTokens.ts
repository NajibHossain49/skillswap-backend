import { prisma } from '../prisma/client';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Prune token rows that are no longer useful:
 *  - refresh tokens that have expired, or were revoked more than 30 days ago
 *    (kept briefly after revocation so reuse-detection can still fire), and
 *  - verification tokens that have expired or already been used.
 */
export async function cleanupExpiredTokens(): Promise<Record<string, unknown>> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - THIRTY_DAYS_MS);

  const [refresh, verification] = await Promise.all([
    prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { isRevoked: true, createdAt: { lt: cutoff } }],
      },
    }),
    prisma.verificationToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
  ]);

  return {
    refreshTokensDeleted: refresh.count,
    verificationTokensDeleted: verification.count,
  };
}
