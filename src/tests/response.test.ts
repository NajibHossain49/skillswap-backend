import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError, sendCreated } from '../utils/response';

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Response Utilities', () => {
  describe('sendSuccess', () => {
    it('should send 200 with success response', () => {
      const res = mockRes();
      sendSuccess(res, { id: 1 }, 'OK');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'OK',
        data: { id: 1 },
      });
    });
  });

  describe('sendCreated', () => {
    it('should send 201 response', () => {
      const res = mockRes();
      sendCreated(res, { id: 1 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created successfully',
        data: { id: 1 },
      });
    });
  });

  describe('sendError', () => {
    it('should send error response', () => {
      const res = mockRes();
      sendError(res, 'Not found', 404);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not found',
        errors: undefined,
      });
    });
  });
});
