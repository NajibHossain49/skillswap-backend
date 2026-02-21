import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendSuccess } from '../../utils/response';

export class UserController {
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getProfile(req.user!.sub);
      sendSuccess(res, user, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateProfile(req.user!.sub, req.body);
      sendSuccess(res, user, 'Profile updated');
    } catch (err) {
      next(err);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.getAllUsers(req.query as any);
      sendSuccess(res, result, 'Users retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id as string);
      sendSuccess(res, user, 'User retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateUserRole(req.params.id as string, req.body);
      sendSuccess(res, user, 'User role updated');
    } catch (err) {
      next(err);
    }
  }

  async deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.deactivateUser(req.params.id as string);
      sendSuccess(res, user, 'User deactivated');
    } catch (err) {
      next(err);
    }
  }

  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.activateUser(req.params.id as string);
      sendSuccess(res, user, 'User activated');
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.deleteUser(req.params.id as string);
      sendSuccess(res, result, 'User deleted');
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
