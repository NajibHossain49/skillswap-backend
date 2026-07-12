import { NotificationType, Prisma, Notification } from '@prisma/client';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { sendEmail, SendEmailInput } from './email.service';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
  email?: SendEmailInput;
}

/**
 * Single façade that all in-app + email notifications flow through. Feature
 * services should import THIS rather than the email service directly.
 *
 * The in-app notification row is always persisted. When an `email` payload is
 * supplied it is dispatched fire-and-forget so a delivery failure can never
 * affect the caller's request path.
 */
export class NotificationService {
  async notify(input: NotifyInput): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        metadata: input.metadata,
      },
    });

    if (input.email) {
      void sendEmail(input.email).catch((err) => {
        logger.error({
          msg: 'Notification email failed',
          userId: input.userId,
          type: input.type,
          err,
        });
      });
    }

    return notification;
  }
}

export const notificationService = new NotificationService();
