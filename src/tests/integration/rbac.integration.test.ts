import { afterAll, expect, it } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import app from '../../app';
import { describeIntegration, createUser, tokenFor, cleanupAll } from './helpers';

const api = request(app);

describeIntegration('RBAC (integration)', () => {
  afterAll(async () => {
    await cleanupAll();
  });

  it('a LEARNER cannot create a skill (401/403)', async () => {
    const { user } = await createUser({ role: Role.LEARNER });
    const token = tokenFor(user);

    const res = await api
      .post('/api/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Intro to TypeScript',
        description: 'Learn the basics of TypeScript in one hour.',
        category: 'Programming',
      });

    expect([401, 403]).toContain(res.status);
  });

  it('an unauthenticated request to create a skill is rejected (401)', async () => {
    const res = await api.post('/api/skills').send({
      title: 'Intro to TypeScript',
      description: 'Learn the basics of TypeScript in one hour.',
      category: 'Programming',
    });
    expect(res.status).toBe(401);
  });
});
