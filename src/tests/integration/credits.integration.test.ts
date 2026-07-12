import { afterAll, expect, it } from 'vitest';
import request from 'supertest';
import { Role, MentorStatus } from '@prisma/client';
import app from '../../app';
import { prisma } from '../../prisma/client';
import { describeIntegration, createUser, tokenFor, cleanupAll } from './helpers';

const api = request(app);

describeIntegration('Credits (integration)', () => {
  afterAll(async () => {
    await cleanupAll();
  });

  it('booking with an insufficient balance is rejected and writes no ledger row', async () => {
    const { user: mentor } = await createUser({ role: Role.MENTOR, mentorStatus: MentorStatus.APPROVED });
    const skill = await prisma.skill.create({
      data: {
        title: 'Expensive Skill',
        description: 'Costs more credits than the learner holds.',
        category: 'Testing',
        creditCost: 5,
        createdById: mentor.id,
      },
    });
    const session = await prisma.session.create({
      data: {
        mentorId: mentor.id,
        skillId: skill.id,
        title: 'Pricey Session',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
        status: 'PENDING',
      },
    });

    // Learner cannot afford the 5-credit session.
    const { user: brokeLearner } = await createUser({ role: Role.LEARNER, creditBalance: 1 });

    const res = await api
      .post(`/api/sessions/${session.id}/book`)
      .set('Authorization', `Bearer ${tokenFor(brokeLearner)}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);

    // No partial ledger row and the session stays open.
    const txns = await prisma.creditTransaction.findMany({
      where: { sessionId: session.id, userId: brokeLearner.id },
    });
    expect(txns).toHaveLength(0);

    const stillOpen = await prisma.session.findUnique({ where: { id: session.id } });
    expect(stillOpen?.status).toBe('PENDING');
    expect(stillOpen?.learnerId).toBeNull();
  });
});
