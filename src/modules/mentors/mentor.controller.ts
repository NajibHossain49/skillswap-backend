import { Request, Response, NextFunction } from 'express';
import { mentorService } from './mentor.service';
import { sendSuccess } from '../../utils/response';

export class MentorController {
  async getMentors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await mentorService.getMentors(req.query as any);
      sendSuccess(res, result, 'Mentors retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getMentorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentor = await mentorService.getMentorById(req.params.id as string);
      sendSuccess(res, mentor, 'Mentor retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getMentorReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await mentorService.getMentorReviews(
        req.params.id as string,
        req.query as any,
      );
      sendSuccess(res, result, 'Reviews retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const mentorController = new MentorController();
