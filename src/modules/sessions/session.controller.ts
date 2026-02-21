import { Request, Response, NextFunction } from 'express';
import { sessionService } from './session.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export class SessionController {
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionService.createSession(req.user!.sub, req.body);
      sendCreated(res, session, 'Session created');
    } catch (err) {
      next(err);
    }
  }

  async getAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await sessionService.getAllSessions(
        req.query as any,
        req.user?.sub,
        req.user?.role,
      );
      sendSuccess(res, result, 'Sessions retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionService.getSessionById(
        req.params.id as string,
        req.user!.sub,
        req.user!.role,
      );
      sendSuccess(res, session, 'Session retrieved');
    } catch (err) {
      next(err);
    }
  }

  async bookSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionService.bookSession(req.params.id as string, req.user!.sub);
      sendSuccess(res, session, 'Session booked successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await sessionService.updateSessionStatus(
        req.params.id as string,
        req.user!.sub,
        req.user!.role,
        req.body,
      );
      sendSuccess(res, session, 'Session status updated');
    } catch (err) {
      next(err);
    }
  }

  async addFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedback = await sessionService.addFeedback(
        req.params.id as string,
        req.user!.sub,
        req.body,
      );
      sendCreated(res, feedback, 'Feedback submitted');
    } catch (err) {
      next(err);
    }
  }

  async getSessionFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedback = await sessionService.getSessionFeedback(req.params.id as string);
      sendSuccess(res, feedback, 'Feedback retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getMentorStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await sessionService.getMentorStats(req.user!.sub);
      sendSuccess(res, stats, 'Stats retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const sessionController = new SessionController();
