import { Prisma, CreditTxnType, CreditTransaction } from '@prisma/client';
import { prisma } from '../prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { notDeleted } from '../utils/prisma-filters';

export interface CreditTransferInput {
  userId: string;
  amount: number; // positive = credit, negative = debit
  type: CreditTxnType;
  sessionId?: string | null;
  description: string;
}

export interface CreditTransferResult {
  balanceAfter: number;
  transaction: CreditTransaction;
}

export interface TransactionQuery {
  page: number;
  limit: number;
  type?: CreditTxnType;
}

export class CreditService {
  /**
   * The single atomic primitive every credit movement flows through.
   *
   * It MUST be called inside a `prisma.$transaction` — the caller passes the
   * transaction client so the balance read, the guard, the balance write and
   * the ledger row all commit (or roll back) together. The user's balance row
   * is locked with `SELECT ... FOR UPDATE` so concurrent transfers cannot race
   * and drive the balance below zero.
   */
  async transfer(
    input: CreditTransferInput,
    tx: Prisma.TransactionClient,
  ): Promise<CreditTransferResult> {
    if (!tx) {
      throw new Error('creditService.transfer must be called inside a prisma.$transaction');
    }
    if (!Number.isInteger(input.amount)) {
      throw new ValidationError('Credit amount must be an integer');
    }

    // Row-lock the balance so concurrent transfers serialize on this user.
    const rows = await tx.$queryRaw<Array<{ creditBalance: number }>>`
      SELECT "creditBalance" FROM "users" WHERE "id" = ${input.userId} FOR UPDATE
    `;
    if (rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const currentBalance = rows[0]!.creditBalance;
    const balanceAfter = currentBalance + input.amount;
    if (balanceAfter < 0) {
      throw new ValidationError('Insufficient credits');
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { creditBalance: balanceAfter },
    });

    const transaction = await tx.creditTransaction.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        balanceAfter,
        type: input.type,
        sessionId: input.sessionId ?? null,
        description: input.description,
      },
    });

    return { balanceAfter, transaction };
  }

  async getBalance(userId: string): Promise<{ creditBalance: number }> {
    const user = await prisma.user.findFirst({
      where: { id: userId, ...notDeleted },
      select: { creditBalance: true },
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async getTransactions(userId: string, query: TransactionQuery) {
    const { page, limit, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CreditTransactionWhereInput = {
      userId,
      ...(type && { type }),
    };

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Admin-initiated manual balance change. Runs the adjustment through the same
   * atomic `transfer` primitive so it is guarded and ledgered like any other
   * credit movement.
   */
  async adminAdjust(targetUserId: string, amount: number, reason: string) {
    return prisma.$transaction((tx) =>
      this.transfer(
        {
          userId: targetUserId,
          amount,
          type: CreditTxnType.ADMIN_ADJUSTMENT,
          description: reason,
        },
        tx,
      ),
    );
  }
}

export const creditService = new CreditService();
