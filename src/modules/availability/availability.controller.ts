import { Request, Response, NextFunction } from 'express';
import { availabilityService } from './availability.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export class AvailabilityController {
  async getMyAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await availabilityService.getMyAvailability(req.user!.sub);
      sendSuccess(res, result, 'Availability retrieved');
    } catch (err) {
      next(err);
    }
  }

  async createAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await availabilityService.createAvailability(req.user!.sub, req.body);
      sendCreated(res, result, 'Availability slot created');
    } catch (err) {
      next(err);
    }
  }

  async updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await availabilityService.updateAvailability(
        req.user!.sub,
        String(req.params.id),
        req.body,
      );
      sendSuccess(res, result, 'Availability slot updated');
    } catch (err) {
      next(err);
    }
  }

  async deleteAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await availabilityService.deleteAvailability(
        req.user!.sub,
        String(req.params.id),
      );
      sendSuccess(res, result, 'Availability slot deleted');
    } catch (err) {
      next(err);
    }
  }

  async getMentorAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await availabilityService.getMentorAvailability(String(req.params.mentorId));
      sendSuccess(res, result, 'Mentor availability retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getMentorSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await availabilityService.getMentorSlots(
        String(req.params.mentorId),
        String(req.query.date),
      );
      sendSuccess(res, result, 'Available slots retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const availabilityController = new AvailabilityController();
