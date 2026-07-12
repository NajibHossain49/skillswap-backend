import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { NotificationQueryDto } from './notification.schema';
import { sendSuccess } from '../../utils/response';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.getNotifications(
        req.user!.sub,
        req.query as unknown as NotificationQueryDto,
      );
      sendSuccess(res, result, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.getUnreadCount(req.user!.sub);
      sendSuccess(res, result, 'Unread count retrieved');
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAsRead(req.user!.sub, String(req.params.id));
      sendSuccess(res, result, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!.sub);
      sendSuccess(res, result, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.deleteNotification(
        req.user!.sub,
        String(req.params.id),
      );
      sendSuccess(res, result, 'Notification deleted');
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
