import { afterAll, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma/client';
import { describeIntegration, uniqueEmail, createUser, trackUserByEmail, cleanupAll } from './helpers';

const api = request(app);

describeIntegration('Auth (integration)', () => {
  afterAll(async () => {
    await cleanupAll();
  });

  it('register → login → refresh → reuse detection burns the token family', async () => {
    const email = uniqueEmail('auth');
    const password = 'Password123!';

    // Register
    const registered = await api
      .post('/api/auth/register')
      .send({ name: 'Flow User', email, password });
    expect(registered.status).toBe(201);
    await trackUserByEmail(email);
    expect(registered.body.data.accessToken).toBeTruthy();

    // Login
    const loggedIn = await api.post('/api/auth/login').send({ email, password });
    expect(loggedIn.status).toBe(200);
    const originalRefresh = loggedIn.body.data.refreshToken as string;
    expect(originalRefresh).toBeTruthy();

    // Refresh (rotate) — original token is now revoked, new pair issued
    const refreshed = await api.post('/api/auth/refresh').send({ refreshToken: originalRefresh });
    expect(refreshed.status).toBe(200);
    const rotatedRefresh = refreshed.body.data.refreshToken as string;
    expect(rotatedRefresh).toBeTruthy();
    expect(rotatedRefresh).not.toBe(originalRefresh);

    // Reuse the already-rotated token → theft detected, family revoked
    const reuse = await api.post('/api/auth/refresh').send({ refreshToken: originalRefresh });
    expect(reuse.status).toBe(401);

    // The rotated token from the same family is now also dead
    const afterBurn = await api.post('/api/auth/refresh').send({ refreshToken: rotatedRefresh });
    expect(afterBurn.status).toBe(401);
  });

  it('repeated failed logins lock the account (429 or lockout)', async () => {
    const password = 'Password123!';
    const { user } = await createUser({ password });

    let lastStatus = 0;
    let lastBody: any;
    for (let i = 0; i < 6; i++) {
      const res = await api
        .post('/api/auth/login')
        .send({ email: user.email, password: 'WrongPassword123!' });
      lastStatus = res.status;
      lastBody = res.body;
    }

    // Either the IP rate limiter (429) or the DB account lockout (401 + message)
    // must have engaged by the 6th attempt.
    const lockedOut = lastStatus === 429 || (lastStatus === 401 && /lock/i.test(lastBody?.message ?? ''));
    expect(lockedOut).toBe(true);

    const locked = await prisma.user.findUnique({ where: { id: user.id }, select: { lockedUntil: true, failedLoginAttempts: true } });
    expect(locked?.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    expect(locked?.lockedUntil).toBeTruthy();
  });
});
