import { Request, Response, NextFunction } from 'express';
import { skillService } from './skill.service';
import { sendSuccess, sendCreated } from '../../utils/response';

export class SkillController {
  async createSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skill = await skillService.createSkill(req.user!.sub, req.body);
      sendCreated(res, skill, 'Skill created successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAllSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await skillService.getAllSkills(req.query as any);
      sendSuccess(res, result, 'Skills retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await skillService.getCategories();
      sendSuccess(res, categories, 'Categories retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getSkillById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skill = await skillService.getSkillById(req.params.id as string);
      sendSuccess(res, skill, 'Skill retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skill = await skillService.updateSkill(
        req.params.id as string,
        req.user!.sub,
        req.user!.role,
        req.body,
      );
      sendSuccess(res, skill, 'Skill updated');
    } catch (err) {
      next(err);
    }
  }

  async deleteSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await skillService.deleteSkill(req.params.id as string, req.user!.sub, req.user!.role);
      sendSuccess(res, null, 'Skill deleted');
    } catch (err) {
      next(err);
    }
  }
}

export const skillController = new SkillController();
