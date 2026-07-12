import { Request, Response, NextFunction } from 'express';
import { bookingService } from './booking.service';
import { BookingQueryDto } from './booking.schema';
import { sendSuccess, sendCreated } from '../../utils/response';

export class BookingController {
  async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bookingService.createRequest(req.user!.sub, req.body);
      sendCreated(res, result, 'Booking request created');
    } catch (err) {
      next(err);
    }
  }

  async getRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bookingService.getRequests(
        req.user!.sub,
        req.user!.role,
        req.query as unknown as BookingQueryDto,
      );
      sendSuccess(res, result, 'Booking requests retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bookingService.getRequestById(
        String(req.params.id),
        req.user!.sub,
        req.user!.role,
      );
      sendSuccess(res, result, 'Booking request retrieved');
    } catch (err) {
      next(err);
    }
  }

  async acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bookingService.acceptRequest(String(req.params.id), req.user!.sub);
      sendSuccess(res, result, 'Booking request accepted');
    } catch (err) {
      next(err);
    }
  }

  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bookingService.rejectRequest(
        String(req.params.id),
        req.user!.sub,
        req.body,
      );
      sendSuccess(res, result, 'Booking request rejected');
    } catch (err) {
      next(err);
    }
  }

  async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bookingService.cancelRequest(String(req.params.id), req.user!.sub);
      sendSuccess(res, result, 'Booking request cancelled');
    } catch (err) {
      next(err);
    }
  }
}

export const bookingController = new BookingController();
