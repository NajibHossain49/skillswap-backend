import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export class ReportController {
  async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.createReport(req.user!.sub, req.body);
      sendCreated(res, report, 'Report submitted');
    } catch (err) {
      next(err);
    }
  }

  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportService.getReports(req.query as any);
      sendSuccess(res, result, 'Reports retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.getReportById(req.params.id as string);
      sendSuccess(res, report, 'Report retrieved');
    } catch (err) {
      next(err);
    }
  }

  async resolveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.resolveReport(
        req.params.id as string,
        req.user!.sub,
        req.body,
      );
      sendSuccess(res, report, 'Report updated');
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
