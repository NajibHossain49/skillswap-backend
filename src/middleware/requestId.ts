import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
   
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : uuidv4();

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
