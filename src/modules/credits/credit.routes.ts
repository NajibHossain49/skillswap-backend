import { Router } from 'express';
import { creditController } from './credit.controller';
import { authenticate } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validate';
import { transactionQuerySchema } from './credit.schema';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/credits/balance
 * @desc    Get the current user's credit balance
 * @access  Private
 */
router.get('/balance', creditController.getBalance.bind(creditController));

/**
 * @route   GET /api/credits/transactions
 * @desc    Get the current user's credit transaction history (paginated)
 * @access  Private
 */
router.get(
  '/transactions',
  validateQuery(transactionQuerySchema),
  creditController.getTransactions.bind(creditController),
);

export default router;
