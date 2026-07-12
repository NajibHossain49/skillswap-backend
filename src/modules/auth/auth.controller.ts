import { Request, Response, NextFunction } from 'express';
import { authService, RequestContext } from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/response';

const getContext = (req: Request): RequestContext => ({
  userAgent: req.get('user-agent') ?? undefined,
  ipAddress: req.ip,
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body, getContext(req));
      sendCreated(res, result, 'Registration successful');
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body, getContext(req));
      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken, getContext(req));
      sendSuccess(res, result, 'Tokens refreshed');
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.logout(refreshToken);
      sendSuccess(res, result, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const result = await authService.logoutAll(userId);
      sendSuccess(res, result, 'Logged out from all devices');
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, req.user, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        getContext(req),
      );
      sendSuccess(res, result, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.forgotPassword(req.body.email);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyEmail(req.body.token);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const result = await authService.resendVerification(userId);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const result = await authService.listSessions(userId);
      sendSuccess(res, result, 'Active sessions retrieved');
    } catch (err) {
      next(err);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const result = await authService.revokeSession(userId, String(req.params.id));
      sendSuccess(res, result, 'Session revoked');
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
