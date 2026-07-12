import { Request, Response, NextFunction } from 'express';
import { creditService } from '../../services/credit.service';
import { sendSuccess } from '../../utils/response';

export class CreditController {
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const balance = await creditService.getBalance(req.user!.sub);
      sendSuccess(res, balance, 'Balance retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creditService.getTransactions(req.user!.sub, req.query as any);
      sendSuccess(res, result, 'Transactions retrieved');
    } catch (err) {
      next(err);
    }
  }

  async adjust(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, amount, reason } = req.body;
      const result = await creditService.adminAdjust(userId, amount, reason);
      sendSuccess(res, result, 'Credit balance adjusted');
    } catch (err) {
      next(err);
    }
  }
}

export const creditController = new CreditController();
