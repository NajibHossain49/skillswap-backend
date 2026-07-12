import { afterAll, expect, it } from 'vitest';
import request from 'supertest';
import { Role, MentorStatus } from '@prisma/client';
import app from '../../app';
import { prisma } from '../../prisma/client';
import { describeIntegration, createUser, tokenFor, cleanupAll } from './helpers';

const api = request(app);

async function createOpenSession() {
  const { user: mentor } = await createUser({ role: Role.MENTOR, mentorStatus: MentorStatus.APPROVED });
  const skill = await prisma.skill.create({
    data: {
      title: 'Race Test Skill',
      description: 'A skill used to test the booking race condition.',
      category: 'Testing',
      creditCost: 1,
      createdById: mentor.id,
    },
  });
  const session = await prisma.session.create({
    data: {
      mentorId: mentor.id,
      skillId: skill.id,
      title: 'Race Test Session',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      duration: 60,
      status: 'PENDING',
    },
  });
  return session;
}

describeIntegration('Session booking race (integration)', () => {
  afterAll(async () => {
    await cleanupAll();
  });

  it('two concurrent bookings on the same session — exactly one wins', async () => {
    const session = await createOpenSession();

    const { user: learnerA } = await createUser({ role: Role.LEARNER, creditBalance: 5 });
    const { user: learnerB } = await createUser({ role: Role.LEARNER, creditBalance: 5 });

    const [resA, resB] = await Promise.all([
      api.post(`/api/sessions/${session.id}/book`).set('Authorization', `Bearer ${tokenFor(learnerA)}`),
      api.post(`/api/sessions/${session.id}/book`).set('Authorization', `Bearer ${tokenFor(learnerB)}`),
    ]);

    const statuses = [resA.status, resB.status].sort();
    const successes = statuses.filter((s) => s === 200).length;

    // Exactly one booking succeeds; the loser gets a 4xx (conflict).
    expect(successes).toBe(1);
    expect(statuses.some((s) => s >= 400)).toBe(true);

    // The session is claimed by exactly one learner and moved to SCHEDULED.
    const finalSession = await prisma.session.findUnique({ where: { id: session.id } });
    expect(finalSession?.status).toBe('SCHEDULED');
    expect([learnerA.id, learnerB.id]).toContain(finalSession?.learnerId);

    // Exactly one SPENT ledger row exists for this session.
    const spent = await prisma.creditTransaction.findMany({
      where: { sessionId: session.id, type: 'SPENT' },
    });
    expect(spent).toHaveLength(1);
  });
});
