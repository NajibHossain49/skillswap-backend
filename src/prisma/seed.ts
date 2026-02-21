import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Admin
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillswap.com' },
    update: {},
    create: {
      email: 'admin@skillswap.com',
      password: adminPassword,
      name: 'System Admin',
      bio: 'Platform administrator',
      role: Role.ADMIN,
    },
  });

  // Create Mentor
  const mentorPassword = await bcrypt.hash('Mentor@123', 12);
  const mentor = await prisma.user.upsert({
    where: { email: 'mentor@skillswap.com' },
    update: {},
    create: {
      email: 'mentor@skillswap.com',
      password: mentorPassword,
      name: 'Jane Mentor',
      bio: 'Expert in web development and TypeScript',
      role: Role.MENTOR,
    },
  });

  // Create Learner
  const learnerPassword = await bcrypt.hash('Learner@123', 12);
  const learner = await prisma.user.upsert({
    where: { email: 'learner@skillswap.com' },
    update: {},
    create: {
      email: 'learner@skillswap.com',
      password: learnerPassword,
      name: 'John Learner',
      bio: 'Eager to learn new skills',
      role: Role.LEARNER,
    },
  });

  // Create Skills
  const skill1 = await prisma.skill.create({
    data: {
      title: 'TypeScript Fundamentals',
      description: 'Learn the basics of TypeScript including types, interfaces, and generics.',
      category: 'Programming',
      createdById: mentor.id,
    },
  });

  const skill2 = await prisma.skill.create({
    data: {
      title: 'Node.js & Express API Development',
      description: 'Build RESTful APIs with Node.js and Express framework.',
      category: 'Backend Development',
      createdById: mentor.id,
    },
  });

  // Create a Session
  await prisma.session.create({
    data: {
      mentorId: mentor.id,
      learnerId: learner.id,
      skillId: skill1.id,
      title: 'Introduction to TypeScript',
      description: 'First session covering TypeScript basics',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      duration: 60,
      status: 'SCHEDULED',
    },
  });

  console.log('✅ Seed completed!');
  console.log('📧 Admin: admin@skillswap.com / Admin@123');
  console.log('📧 Mentor: mentor@skillswap.com / Mentor@123');
  console.log('📧 Learner: learner@skillswap.com / Learner@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
