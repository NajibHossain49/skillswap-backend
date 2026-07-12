import { expect, it } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { describeIntegration } from './helpers';

const api = request(app);

describeIntegration('Pagination clamping (integration)', () => {
  it('?limit=99999 is clamped to the maximum, not honoured', async () => {
    const res = await api.get('/api/skills').query({ limit: '99999', page: '1' });
    expect(res.status).toBe(200);
    // skillQuerySchema clamps limit into [1, 100].
    expect(res.body.data.pagination.limit).toBe(100);
    expect(res.body.data.pagination.limit).not.toBe(99999);
  });

  it('a non-numeric limit falls back to the default', async () => {
    const res = await api.get('/api/skills').query({ limit: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(10);
  });
});
