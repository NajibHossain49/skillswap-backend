import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../utils/response';

export class AdminController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      sendSuccess(res, stats, 'Dashboard data retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getPlatformActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const activity = await adminService.getPlatformActivity(days);
      sendSuccess(res, activity, 'Platform activity retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
