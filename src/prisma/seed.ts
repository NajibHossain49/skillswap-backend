import {
  Role,
  SessionStatus,
  MentorStatus,
  NotificationType,
  BookingRequestStatus,
  CreditTxnType,
  ReportReason,
  ReportStatus,
  Prisma,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from './client';

async function main() {
  console.log('🌱 Starting large realistic seed — current date: February 22, 2026');

  const hash = async (pw: string) => bcrypt.hash(pw, 12);

  // ── 1. Admin (unchanged) ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillswap.com' },
    update: {},
    create: {
      email: 'admin@skillswap.com',
      password: await hash('Adm!n-SkillSwap-2026'),
      name: 'Alex Rivero',
      bio: 'Platform owner & lead moderator. Ex-engineering manager.',
      role: Role.ADMIN,
    },
  });

  // ── 2. Mentors (8) ──────────────────────────────────────────────────────
  const mentorData = [
    { email: 'sarah.chen@skillswap.com', name: 'Sarah Chen', bio: 'Staff full-stack eng (9y+). TS, React 19/Next.js 15, tRPC, AWS. Ex-unicorn scale-up.' },
    { email: 'michael.kovacs@skillswap.com', name: 'Michael Kovács', bio: 'AI & backend. LangChain, LlamaIndex, FastAPI, PGVector, PyTorch. Production RAG & agents.' },
    { email: 'priya.sharma@skillswap.com', name: 'Priya Sharma', bio: 'Cloud & DevOps — AWS Pro, Azure, Kubernetes CKA/CKAD. Terraform, ArgoCD, observability.' },
    { email: 'david.moreno@skillswap.com', name: 'David Moreno', bio: 'Cybersecurity. OSCP, AWS Security Specialty. Threat modeling, secure SDLC, pentest.' },
    { email: 'lina.ng@skillswap.com', name: 'Lina Nguyen', bio: 'Frontend & design systems. React, Tailwind, shadcn/ui, Radix, Storybook, a11y, Figma-to-code.' },
    { email: 'omar.ali@skillswap.com', name: 'Omar Ali', bio: 'Data & ML engineering. Python, Spark, dbt, Airflow, Snowflake. Ex-data platform lead.' },
    { email: 'julia.berg@skillswap.com', name: 'Julia Berg', bio: 'Go & Rust specialist. Performance backend, microservices, WASM, systems programming.' },
    { email: 'raj.patel@skillswap.com', name: 'Raj Patel', bio: 'Mobile & cross-platform. React Native, Flutter, Swift/Kotlin. App architecture & CI/CD.' },
  ];

  const mentors: any[] = [];
  for (const data of mentorData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: { ...data, password: await hash('Mentor2026!!'), role: Role.MENTOR },
    });
    mentors.push(user);
  }

  // ── 3. Learners (18) ────────────────────────────────────────────────────
  // (kept the same 18 learners from previous version – no change needed)

  const learnerData = [
    { email: 'emma.w@skillswap.com', name: 'Emma Wilson', bio: 'Junior TS/React. Wants production patterns, testing, component libraries.' },
    { email: 'noah.p@skillswap.com', name: 'Noah Patel', bio: 'Data analyst → data eng. SQL strong, learning Python, Airflow, vector DBs.' },
    { email: 'olivia.l@skillswap.com', name: 'Olivia López', bio: 'Self-taught Python. Deep into LLMs, prompt eng, first RAG projects.' },
    { email: 'liam.k@skillswap.com', name: 'Liam Kim', bio: 'Docker basics. Targeting Kubernetes, GitOps, observability in prod.' },
    { email: 'ava.m@skillswap.com', name: 'Ava Martin', bio: 'Product manager. Wants APIs, system design, prompt engineering basics.' },
    { email: 'sophia.r@skillswap.com', name: 'Sophia Rossi', bio: 'Cyber beginner. Practical ethical hacking, secure coding intro.' },
    { email: 'james.t@skillswap.com', name: 'James Taylor', bio: 'Node/Express mid-level. Exploring GraphQL, NestJS, microservices.' },
    { email: 'mason.z@skillswap.com', name: 'Mason Zhang', bio: 'Career switcher. Modern frontend from zero — React + TS focus.' },
    { email: 'isabella.c@skillswap.com', name: 'Isabella Costa', bio: 'Mid designer → dev. Component-driven, shadcn/ui, Tailwind.' },
    { email: 'ethan.b@skillswap.com', name: 'Ethan Brooks', bio: 'Cloud newbie. Wants AWS cert path + practical IaC with Terraform.' },
    { email: 'mia.j@skillswap.com', name: 'Mia Johnson', bio: 'Python dev pivoting to AI. LangChain, agents, evaluation frameworks.' },
    { email: 'alex.k@skillswap.com', name: 'Alex Kim', bio: 'DevOps intern. GitHub Actions, CI/CD pipelines, Docker Compose expert.' },
    { email: 'zara.h@skillswap.com', name: 'Zara Hassan', bio: 'Security enthusiast. OWASP, secure headers, auth best practices.' },
    { email: 'lucas.m@skillswap.com', name: 'Lucas Müller', bio: 'Go learner. Microservices, concurrency patterns, deployment.' },
    { email: 'nina.s@skillswap.com', name: 'Nina Singh', bio: 'React Native beginner. Mobile-first UI, performance tips.' },
    { email: 'ryan.c@skillswap.com', name: 'Ryan Carter', bio: 'Data viz specialist. Wants D3.js → modern tools (Observable, Vega-Lite).' },
    { email: 'sofia.g@skillswap.com', name: 'Sofia Garcia', bio: 'Mid backend. Wants Rust for performance-critical services.' },
    { email: 'leo.v@skillswap.com', name: 'Leo Vargas', bio: 'Flutter enthusiast. Cross-platform apps, state management deep dive.' },
  ];

  const learners: any[] = [];
  for (const l of learnerData) {
    const user = await prisma.user.upsert({
      where: { email: l.email },
      update: {},
      create: { ...l, password: await hash('Learner2026!!'), role: Role.LEARNER },
    });
    learners.push(user);
  }

  // ── 4. Skills (28) ──────────────────────────────────────────────────────
  // (kept the same expanded list – no change needed here)

  interface SkillInput { title: string; category: string; mentorIndex: number; desc?: string }
  const skillInputs: SkillInput[] = [
    { title: 'Advanced TypeScript 2026 — Branded Types, infer, Effect System', category: 'Programming', mentorIndex: 0 },
    { title: 'Next.js 15 / React 19 — Server Components, Actions, Partial Prerendering', category: 'Frontend', mentorIndex: 0 },
    { title: 'Agentic AI & Autonomous Agents — LangGraph, CrewAI, AutoGen', category: 'AI & LLM', mentorIndex: 1 },
    { title: 'RAG & Multimodal Retrieval — LangChain, LlamaIndex, PGVector', category: 'AI & LLM', mentorIndex: 1 },
    { title: 'FastAPI 2026 — Pydantic v2, Background Tasks, Rate Limiting', category: 'Backend', mentorIndex: 1 },
    { title: 'AWS Professional — Advanced Networking, Cost Optimization, Well-Architected', category: 'Cloud & DevOps', mentorIndex: 2 },
    { title: 'Kubernetes 2026 — Karpenter, Cilium, eBPF, GitOps with Flux', category: 'Cloud & DevOps', mentorIndex: 2 },
    { title: 'Practical Web & API Pentesting 2026', category: 'Cybersecurity', mentorIndex: 3 },
    { title: 'Secure Coding & OWASP Top 10 / API Security 2026', category: 'Cybersecurity', mentorIndex: 3 },
    { title: 'shadcn/ui + Tailwind + Radix — Design Systems 2026', category: 'Frontend', mentorIndex: 4 },
    { title: 'Figma → React — Tokens, Variables, Dev Mode, Auto Layout', category: 'Frontend / Design', mentorIndex: 4 },
    { title: 'GraphQL Federation v2 & Apollo Router Best Practices', category: 'Backend', mentorIndex: 0 },
    { title: 'Prompt Engineering & LLM Evaluation — DSPy, Promptfoo', category: 'AI & LLM', mentorIndex: 1 },
    { title: 'GitHub Actions Advanced — Matrices, Reusable Workflows, OIDC', category: 'DevOps', mentorIndex: 2 },
    { title: 'Observability 2026 — OpenTelemetry, Grafana Tempo/Loki/Mimir', category: 'DevOps', mentorIndex: 2 },
    { title: 'Data Engineering Basics — dbt, Airflow, Spark, DuckDB', category: 'Data & ML', mentorIndex: 5 },
    { title: 'Modern Data Stack — Snowflake / BigQuery, dbt Cloud, Looker', category: 'Data & ML', mentorIndex: 5 },
    { title: 'Go for Backend 2026 — Concurrency, Error Handling, Wire/HTMX', category: 'Backend', mentorIndex: 6 },
    { title: 'Rust Fundamentals — Ownership, Lifetimes, Actix/Tokio Web', category: 'Systems', mentorIndex: 6 },
    { title: 'React Native 2026 — New Architecture, Expo Router, Reanimated 3', category: 'Mobile', mentorIndex: 7 },
    { title: 'Flutter 3.24+ — Impeller, Slivers, Riverpod 3, Supabase', category: 'Mobile', mentorIndex: 7 },
    { title: 'AI Product Thinking — LLMOps, Prompt → Product workflows', category: 'AI & LLM', mentorIndex: 1 },
    { title: 'Zero Trust & Modern Auth — Passkeys, WebAuthn, OAuth 2.1', category: 'Cybersecurity', mentorIndex: 3 },
    { title: 'TanStack Query + TanStack Router — Full Data Layer 2026', category: 'Frontend', mentorIndex: 4 },
    { title: 'Serverless on AWS — Lambda, Step Functions, EventBridge', category: 'Cloud & DevOps', mentorIndex: 2 },
    { title: 'Edge Computing & WASM — Cloudflare Workers, WASI, Spin', category: 'Cloud & DevOps', mentorIndex: 6 },
    { title: 'MLOps Basics — MLflow, BentoML, KServe, Model Monitoring', category: 'Data & ML', mentorIndex: 5 },
    { title: 'Ethical AI & Responsible GenAI Usage', category: 'AI & LLM', mentorIndex: 1 },
  ];

  const skills: any[] = [];
  for (const s of skillInputs) {
    const skill = await prisma.skill.create({
      data: {
        title: s.title,
        description: s.desc || `Hands-on, up-to-date mentoring in ${s.title}. Real projects, best practices & 2026 patterns.`,
        category: s.category,
        createdById: mentors[s.mentorIndex].id,
      },
    });
    skills.push(skill);
  }

  // ── 5. Sessions — ~45 entries with realistic date spread ────────────────
  const now = new Date('2026-02-22T10:00:00Z');
  const dayMs = 24 * 60 * 60 * 1000;

  const sessionData = [
    // Past – COMPLETED (mostly Jan–mid Feb 2026)
    { mentor: 3, learner: 5, skill: 7, title: 'Burp Suite + API vuln discovery basics', scheduledAt: -38, duration: 75, status: 'COMPLETED' },
    { mentor: 4, learner: 7, skill: 9, title: 'Figma tokens → production-ready components', scheduledAt: -32, duration: 60, status: 'COMPLETED' },
    { mentor: 0, learner: 6, skill: 1, title: 'Next.js 15 App Router real-world patterns', scheduledAt: -25, duration: 60, status: 'COMPLETED' },
    { mentor: 2, learner: 3, skill: 6, title: 'Kubernetes first deployment troubleshooting', scheduledAt: -19, duration: 90, status: 'COMPLETED' },
    { mentor: 1, learner: 2, skill: 3, title: 'RAG pipeline – chunking & retrieval strategies', scheduledAt: -15, duration: 75, status: 'COMPLETED' },
    { mentor: 5, learner: 15, skill: 16, title: 'Modern data visualization with Observable', scheduledAt: -12, duration: 60, status: 'COMPLETED' },
    { mentor: 0, learner: 0, skill: 0, title: 'TS generics & utility types deep dive', scheduledAt: -8, duration: 60, status: 'COMPLETED' },
    { mentor: 7, learner: 14, skill: 19, title: 'React Native new architecture intro', scheduledAt: -5, duration: 60, status: 'COMPLETED' },

    // Upcoming – SCHEDULED (Feb 23 – March 25, 2026)
    { mentor: 0, learner: 0, skill: 0, title: 'TypeScript branded types & type-level tricks', scheduledAt: 3, duration: 60, status: 'SCHEDULED' },
    { mentor: 1, learner: 2, skill: 2, title: 'First autonomous agent with LangGraph', scheduledAt: 5, duration: 75, status: 'SCHEDULED' },
    { mentor: 4, learner: 8, skill: 9, title: 'Consistent UI kit with shadcn/ui + Tailwind', scheduledAt: 7, duration: 60, status: 'SCHEDULED' },
    { mentor: 2, learner: null, skill: 6, title: 'Kubernetes office hours – debugging & scaling', scheduledAt: 9, duration: 90, status: 'SCHEDULED', desc: 'Drop-in session' },
    { mentor: 5, learner: 1, skill: 15, title: 'dbt + Snowflake – analytics engineering basics', scheduledAt: 11, duration: 60, status: 'SCHEDULED' },
    { mentor: 3, learner: 12, skill: 22, title: 'Passkeys & WebAuthn implementation', scheduledAt: 13, duration: 75, status: 'SCHEDULED' },
    { mentor: 6, learner: 13, skill: 18, title: 'Go concurrency – channels & select patterns', scheduledAt: 15, duration: 60, status: 'SCHEDULED' },
    { mentor: 1, learner: 10, skill: 12, title: 'Prompt optimization with DSPy & evals', scheduledAt: 17, duration: 60, status: 'SCHEDULED' },
    { mentor: 0, learner: 6, skill: 11, title: 'GraphQL Federation in microservices', scheduledAt: 19, duration: 60, status: 'SCHEDULED' },
    { mentor: 2, learner: 11, skill: 13, title: 'GitHub Actions reusable workflows & security', scheduledAt: 21, duration: 60, status: 'SCHEDULED' },

    // More upcoming
    { mentor: 4, learner: 9, skill: 10, title: 'Figma variables & tokens to React pipeline', scheduledAt: 25, duration: 60, status: 'SCHEDULED' },
    { mentor: 7, learner: 17, skill: 20, title: 'Flutter state management – Riverpod deep dive', scheduledAt: 28, duration: 75, status: 'SCHEDULED' },
    { mentor: 5, learner: 16, skill: 26, title: 'MLOps intro – model serving & monitoring', scheduledAt: 32, duration: 60, status: 'SCHEDULED' },

    // Pending (awaiting approval)
    { mentor: 1, learner: 1, skill: 3, title: 'Multimodal RAG – images + text retrieval', scheduledAt: 4, duration: 60, status: 'PENDING' },
    { mentor: 3, learner: 11, skill: 8, title: 'Implementing CSP & secure headers', scheduledAt: 6, duration: 45, status: 'PENDING' },
    { mentor: 2, learner: 4, skill: 24, title: 'Serverless patterns on AWS Lambda', scheduledAt: 10, duration: 60, status: 'PENDING' },

    // Cancelled (recent past)
    { mentor: 2, learner: 4, skill: 5, title: 'AWS Well-Architected cost review', scheduledAt: -6, duration: 60, status: 'CANCELLED', desc: 'Learner rescheduled' },
    { mentor: 4, learner: 9, skill: 10, title: 'Figma to code handoff workshop', scheduledAt: -14, duration: 60, status: 'CANCELLED', desc: 'Mentor emergency' },
    { mentor: 0, learner: 7, skill: 1, title: 'React 19 hooks deep dive', scheduledAt: -20, duration: 60, status: 'CANCELLED', desc: 'Learner conflict' },
  ];

  await prisma.session.createMany({
    data: sessionData.map(s => ({
      mentorId: mentors[s.mentor].id,
      learnerId: s.learner !== undefined && s.learner !== null ? learners[s.learner].id : null,
      skillId: skills[s.skill].id,
      title: s.title,
      description: s.desc || undefined,
      scheduledAt: new Date(now.getTime() + s.scheduledAt * dayMs),
      duration: s.duration,
      status: SessionStatus[s.status as keyof typeof SessionStatus],
    })),
    skipDuplicates: true,
  });

  // ── 6. Feedback — for ALL completed sessions ─────────────────────────────
  const completed = await prisma.session.findMany({
    where: { status: SessionStatus.COMPLETED },
    select: { id: true, learnerId: true },
  });

  const feedbackComments = [
    'Excellent structure and very practical examples. Already applying this at work!',
    'Super helpful — cleared up many misconceptions. Looking forward to more sessions.',
    'Great pacing and real-world focus. Highly recommend this mentor.',
    'Clear explanations + good debugging tips. Worth every minute.',
    'Solid intro with actionable takeaways. Thanks for the resources!',
    'Very patient and thorough. Helped me get unstuck on my project.',
    'Fantastic session — learned more in 60 min than in weeks of self-study.',
    'Really enjoyed the hands-on coding part. Great energy!',
    'Mentor was extremely knowledgeable. Answered all my questions.',
  ];

  for (const sess of completed) {
    if (!sess.learnerId) continue;

    await prisma.feedback.upsert({
      where: { sessionId: sess.id },
      update: {},
      create: {
        sessionId: sess.id,
        learnerId: sess.learnerId,
        rating: Math.floor(Math.random() * 3) + 3, // 3–5
        comment: feedbackComments[Math.floor(Math.random() * feedbackComments.length)],
      },
    });
  }

  // ── 7. Backfill denormalized mentor stats ────────────────────────────────
  // ratingAvg / ratingCount mirror what session.addFeedback recomputes, and
  // totalSessionsTaught reflects completed sessions — so the credit economy and
  // public mentor discovery endpoints have realistic data out of the box.
  for (const mentor of mentors) {
    const [ratingAgg, taught] = await Promise.all([
      prisma.feedback.aggregate({
        where: { session: { mentorId: mentor.id } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.session.count({ where: { mentorId: mentor.id, status: SessionStatus.COMPLETED } }),
    ]);

    await prisma.user.update({
      where: { id: mentor.id },
      data: {
        ratingAvg: ratingAgg._avg.rating ?? 0,
        ratingCount: ratingAgg._count.rating,
        totalSessionsTaught: taught,
        // Seeded mentors are pre-approved so they pass the mentor-approval guard.
        mentorStatus: MentorStatus.APPROVED,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  8. Demo data for the six previously-empty modules
  //
  //  These are the tables that /notifications, /credits, /bookings, /reports,
  //  /admin/audit-logs and /admin/mentor-applications read from. Everything
  //  here is CLEAR-THEN-INSERT so the seed stays idempotent and re-runnable:
  //  we wipe these tables first, then rebuild them against the users / skills /
  //  sessions seeded above (never duplicating them).
  // ═══════════════════════════════════════════════════════════════════════

  // Notification links mirror what the feature services emit at runtime.
  const appUrl = process.env.APP_URL?.trim() || 'http://localhost:3001';
  const sessionLink = (id: string) => `${appUrl}/sessions/${id}`;
  const feedbackLink = (id: string) => `${appUrl}/sessions/${id}/feedback`;
  const bookingLink = (id: string) => `${appUrl}/bookings/${id}`;

  await prisma.$transaction([
    prisma.availability.deleteMany({}),
    prisma.bookingRequest.deleteMany({}),
    prisma.creditTransaction.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.report.deleteMany({}),
    prisma.auditLog.deleteMany({}),
  ]);

  // ── 8a. Availability — weekly recurring slots for 4 mentors ──────────────
  const availabilityRows = [
    // Sarah Chen (mentor 0) — weekday evenings + Saturday morning
    { m: 0, day: 1, start: '18:00', end: '21:00' },
    { m: 0, day: 3, start: '18:00', end: '21:00' },
    { m: 0, day: 6, start: '10:00', end: '14:00' },
    // Michael Kovács (mentor 1) — midweek daytime + Sunday morning
    { m: 1, day: 2, start: '09:00', end: '12:00' },
    { m: 1, day: 4, start: '14:00', end: '17:00' },
    { m: 1, day: 0, start: '10:00', end: '13:00' },
    // Priya Sharma (mentor 2) — early mornings + Friday evening
    { m: 2, day: 1, start: '07:00', end: '09:00' },
    { m: 2, day: 2, start: '07:00', end: '09:00' },
    { m: 2, day: 5, start: '16:00', end: '20:00' },
    // Lina Nguyen (mentor 4) — afternoons + weekend morning
    { m: 4, day: 3, start: '13:00', end: '16:00' },
    { m: 4, day: 5, start: '13:00', end: '16:00' },
    { m: 4, day: 6, start: '09:00', end: '12:00' },
  ];
  await prisma.availability.createMany({
    data: availabilityRows.map((a) => ({
      mentorId: mentors[a.m].id,
      dayOfWeek: a.day,
      startTime: a.start,
      endTime: a.end,
      timezone: 'Asia/Dhaka',
    })),
  });

  // ── 8b. BookingRequests — ~12 across every status ────────────────────────
  // ACCEPTED requests must point at a real Session, so we hang them off the
  // SCHEDULED (i.e. booked) sessions seeded above and reuse their exact
  // learner / mentor / skill / time.
  const bookableSessions = await prisma.session.findMany({
    where: { status: SessionStatus.SCHEDULED, learnerId: { not: null } },
    select: {
      id: true,
      mentorId: true,
      learnerId: true,
      skillId: true,
      scheduledAt: true,
      duration: true,
      title: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: 4,
  });

  const acceptedBookings = bookableSessions.map((s) => ({
    learnerId: s.learnerId!,
    mentorId: s.mentorId,
    skillId: s.skillId,
    message: `Excited for "${s.title}" — I've prepped a few specific questions in advance.`,
    proposedAt: s.scheduledAt,
    duration: s.duration,
    status: BookingRequestStatus.ACCEPTED,
    sessionId: s.id,
    createdAt: new Date(s.scheduledAt.getTime() - 3 * dayMs),
  }));

  // Standalone requests (no Session) covering the remaining four statuses.
  const otherBookings = [
    {
      l: 3, m: 2, sk: 6, status: BookingRequestStatus.PENDING, proposedDay: 6, createdDaysAgo: 1,
      msg: 'Could we cover cost optimization and Well-Architected reviews?',
    },
    {
      l: 10, m: 1, sk: 12, status: BookingRequestStatus.PENDING, proposedDay: 8, createdDaysAgo: 2,
      msg: 'Keen to set up a proper eval harness with DSPy — is this in scope?',
    },
    {
      l: 5, m: 3, sk: 8, status: BookingRequestStatus.REJECTED, proposedDay: 3, createdDaysAgo: 5,
      msg: 'Would love a hands-on pentest walkthrough.',
      reject: 'Fully booked that week — please propose a slot after March 10.',
    },
    {
      l: 8, m: 4, sk: 10, status: BookingRequestStatus.REJECTED, proposedDay: 4, createdDaysAgo: 9,
      msg: 'Design-system review for our shadcn/ui migration?',
      reject: 'This is outside the topics I currently mentor on.',
    },
    {
      l: 4, m: 2, sk: 24, status: BookingRequestStatus.CANCELLED, proposedDay: 5, createdDaysAgo: 2,
      msg: 'Serverless patterns on Lambda + Step Functions.',
    },
    {
      l: 7, m: 0, sk: 1, status: BookingRequestStatus.CANCELLED, proposedDay: 7, createdDaysAgo: 7,
      msg: 'React 19 hooks deep dive — had to reschedule, sorry!',
    },
    {
      l: 11, m: 3, sk: 22, status: BookingRequestStatus.EXPIRED, proposedDay: -3, createdDaysAgo: 12,
      msg: 'Passkeys & WebAuthn rollout guidance.',
    },
    {
      l: 16, m: 5, sk: 26, status: BookingRequestStatus.EXPIRED, proposedDay: -5, createdDaysAgo: 15,
      msg: 'MLOps intro — model serving and monitoring.',
    },
  ];

  await prisma.bookingRequest.createMany({
    data: [
      ...acceptedBookings,
      ...otherBookings.map((b) => ({
        learnerId: learners[b.l].id,
        mentorId: mentors[b.m].id,
        skillId: skills[b.sk].id,
        message: b.msg,
        proposedAt: new Date(now.getTime() + b.proposedDay * dayMs),
        duration: 60,
        status: b.status,
        rejectReason: b.reject ?? null,
        createdAt: new Date(now.getTime() - b.createdDaysAgo * dayMs),
      })),
    ],
  });

  const bookings = await prisma.bookingRequest.findMany({
    select: { id: true, status: true, sessionId: true },
    orderBy: { createdAt: 'asc' },
  });
  const firstBookingOf = (status: BookingRequestStatus) => bookings.find((b) => b.status === status);

  // ── 8c. CreditTransactions — coherent per-user ledgers ───────────────────
  // Each ledger's running balanceAfter is derived here, and the user's
  // creditBalance column is overwritten to match the final value so the
  // /credits page and the balance chip never disagree.
  const someSessions = await prisma.session.findMany({
    select: { id: true },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
  });
  const sessRef = (i: number) => someSessions[i]?.id ?? null;

  interface LedgerEntry {
    type: CreditTxnType;
    amount: number;
    description: string;
    daysAgo: number;
    sessionId?: string | null;
  }

  const buildLedger = async (userId: string, entries: LedgerEntry[]) => {
    let balance = 0;
    const rows = entries.map((e) => {
      balance += e.amount;
      return {
        userId,
        amount: e.amount,
        balanceAfter: balance,
        type: e.type,
        sessionId: e.sessionId ?? null,
        description: e.description,
        createdAt: new Date(now.getTime() - e.daysAgo * dayMs),
      };
    });
    await prisma.creditTransaction.createMany({ data: rows });
    await prisma.user.update({ where: { id: userId }, data: { creditBalance: balance } });
    return balance;
  };

  const SIGNUP = 'Welcome bonus: 3 starter credits';

  // Emma (learner) — spends her way down to 1 credit.
  await buildLedger(learners[0].id, [
    { type: CreditTxnType.SIGNUP_BONUS, amount: 3, description: SIGNUP, daysAgo: 40 },
    { type: CreditTxnType.SPENT, amount: -1, description: 'Booked session: TS generics & utility types deep dive', daysAgo: 10, sessionId: sessRef(0) },
    { type: CreditTxnType.SPENT, amount: -1, description: 'Booked session: TypeScript branded types & type-level tricks', daysAgo: 2, sessionId: sessRef(1) },
  ]);

  // Noah (learner) — a spend that gets refunded when the mentor cancels.
  await buildLedger(learners[1].id, [
    { type: CreditTxnType.SIGNUP_BONUS, amount: 3, description: SIGNUP, daysAgo: 38 },
    { type: CreditTxnType.SPENT, amount: -1, description: 'Booked session: dbt + Snowflake analytics basics', daysAgo: 9, sessionId: sessRef(2) },
    { type: CreditTxnType.REFUND, amount: 1, description: 'Refund: session cancelled by mentor', daysAgo: 6, sessionId: sessRef(2) },
  ]);

  // Olivia (learner) — spends twice, then an admin tops her up for a no-show.
  await buildLedger(learners[2].id, [
    { type: CreditTxnType.SIGNUP_BONUS, amount: 3, description: SIGNUP, daysAgo: 36 },
    { type: CreditTxnType.SPENT, amount: -1, description: 'Booked session: RAG pipeline – chunking & retrieval strategies', daysAgo: 16, sessionId: sessRef(3) },
    { type: CreditTxnType.SPENT, amount: -1, description: 'Booked session: First autonomous agent with LangGraph', daysAgo: 5, sessionId: sessRef(4) },
    { type: CreditTxnType.ADMIN_ADJUSTMENT, amount: 2, description: 'Goodwill credit for reported mentor no-show', daysAgo: 3 },
  ]);

  // Sarah (mentor) — earns credits for teaching.
  await buildLedger(mentors[0].id, [
    { type: CreditTxnType.SIGNUP_BONUS, amount: 3, description: SIGNUP, daysAgo: 42 },
    { type: CreditTxnType.EARNED, amount: 1, description: 'Earned: taught "TS generics & utility types deep dive"', daysAgo: 8, sessionId: sessRef(0) },
    { type: CreditTxnType.EARNED, amount: 1, description: 'Earned: taught "Next.js 15 App Router real-world patterns"', daysAgo: 24, sessionId: sessRef(5) },
  ]);

  // Michael (mentor) — earns, then spends on a peer session himself.
  await buildLedger(mentors[1].id, [
    { type: CreditTxnType.SIGNUP_BONUS, amount: 3, description: SIGNUP, daysAgo: 41 },
    { type: CreditTxnType.EARNED, amount: 1, description: 'Earned: taught "RAG pipeline – chunking & retrieval strategies"', daysAgo: 15, sessionId: sessRef(3) },
    { type: CreditTxnType.EARNED, amount: 1, description: 'Earned: taught "Multimodal RAG – images + text retrieval"', daysAgo: 4 },
    { type: CreditTxnType.SPENT, amount: -1, description: 'Booked peer session: Kubernetes office hours', daysAgo: 1, sessionId: sessRef(6) },
  ]);

  // Priya (mentor) — earn, an admin correction, then a policy refund.
  await buildLedger(mentors[2].id, [
    { type: CreditTxnType.SIGNUP_BONUS, amount: 3, description: SIGNUP, daysAgo: 39 },
    { type: CreditTxnType.EARNED, amount: 1, description: 'Earned: taught "Kubernetes first deployment troubleshooting"', daysAgo: 19, sessionId: sessRef(7) },
    { type: CreditTxnType.ADMIN_ADJUSTMENT, amount: -1, description: 'Correction: duplicate teaching credit reversed', daysAgo: 12 },
    { type: CreditTxnType.REFUND, amount: 1, description: 'Refund: learner cancelled within policy window', daysAgo: 5 },
  ]);

  // ── 8d. Notifications — 15–20 mixing types & read state ──────────────────
  // createdAt is spread over the last two weeks relative to the REAL current
  // time (not the fixed narrative date) so the frontend's "Today / Yesterday /
  // Older" grouping is always exercised, whenever the seed happens to run.
  const realNow = Date.now();
  const hoursAgo = (h: number) => new Date(realNow - h * 60 * 60 * 1000);

  const acceptedBooking = firstBookingOf(BookingRequestStatus.ACCEPTED);
  const pendingBooking = firstBookingOf(BookingRequestStatus.PENDING);
  const rejectedBooking = firstBookingOf(BookingRequestStatus.REJECTED);
  const completedIds = completed.map((c) => c.id);

  const notifications: Prisma.NotificationCreateManyInput[] = [
    // Today
    {
      userId: mentors[2].id, type: NotificationType.BOOKING_REQUEST,
      title: 'New booking request', body: 'Liam Kim requested an "AWS Professional" session',
      link: pendingBooking ? bookingLink(pendingBooking.id) : `${appUrl}/bookings`,
      isRead: false, createdAt: hoursAgo(1),
    },
    {
      userId: learners[0].id, type: NotificationType.SESSION_REMINDER,
      title: 'Session starts in 1 hour', body: 'Your session "TypeScript branded types" starts soon.',
      link: sessionLink(bookableSessions[0]?.id ?? someSessions[0]?.id ?? ''),
      isRead: false, createdAt: hoursAgo(3),
    },
    {
      userId: learners[2].id, type: NotificationType.BOOKING_ACCEPTED,
      title: 'Booking accepted', body: 'Michael Kovács accepted your "First autonomous agent with LangGraph" request',
      link: acceptedBooking?.sessionId ? sessionLink(acceptedBooking.sessionId) : `${appUrl}/sessions`,
      isRead: false, createdAt: hoursAgo(6),
    },
    {
      userId: learners[1].id, type: NotificationType.SYSTEM,
      title: '1 credit refunded', body: 'A cancelled session was refunded to your balance.',
      link: `${appUrl}/credits`, isRead: true, createdAt: hoursAgo(10),
    },
    // Yesterday
    {
      userId: mentors[0].id, type: NotificationType.FEEDBACK_RECEIVED,
      title: 'New feedback received', body: 'Emma Wilson left a 5★ review on your TypeScript session.',
      link: sessionLink(completedIds[0] ?? someSessions[0]?.id ?? ''),
      isRead: false, createdAt: hoursAgo(26),
    },
    {
      userId: learners[5].id, type: NotificationType.BOOKING_REJECTED,
      title: 'Booking declined', body: 'David Moreno declined your "Practical Web & API Pentesting" request',
      link: rejectedBooking ? bookingLink(rejectedBooking.id) : `${appUrl}/bookings`,
      isRead: true, createdAt: hoursAgo(30),
    },
    {
      userId: learners[7].id, type: NotificationType.SESSION_COMPLETED,
      title: 'Session completed', body: 'Your session is complete. Leave feedback to help others!',
      link: feedbackLink(completedIds[1] ?? someSessions[0]?.id ?? ''),
      isRead: false, createdAt: hoursAgo(40),
    },
    // Older (this week / last two weeks)
    {
      userId: learners[0].id, type: NotificationType.SESSION_BOOKED,
      title: 'Session booked', body: 'You booked "TS generics & utility types deep dive" with Sarah Chen.',
      link: sessionLink(completedIds[0] ?? someSessions[0]?.id ?? ''),
      isRead: true, createdAt: hoursAgo(52),
    },
    {
      userId: mentors[1].id, type: NotificationType.BOOKING_REQUEST,
      title: 'New booking request', body: 'Mia Johnson requested a "Prompt Engineering & LLM Evaluation" session',
      link: pendingBooking ? bookingLink(pendingBooking.id) : `${appUrl}/bookings`,
      isRead: true, createdAt: hoursAgo(72),
    },
    {
      userId: learners[4].id, type: NotificationType.SESSION_CANCELLED,
      title: 'Session cancelled', body: 'Your "Serverless patterns on AWS Lambda" request was cancelled.',
      link: `${appUrl}/bookings`, isRead: true, createdAt: hoursAgo(90),
    },
    {
      userId: learners[2].id, type: NotificationType.SYSTEM,
      title: '2 credits added', body: 'An admin added 2 credits to your account (goodwill for a no-show).',
      link: `${appUrl}/credits`, isRead: false, createdAt: hoursAgo(110),
    },
    {
      userId: mentors[0].id, type: NotificationType.SESSION_COMPLETED,
      title: 'Session completed', body: 'Your session "Next.js 15 App Router real-world patterns" was marked complete.',
      link: sessionLink(completedIds[2] ?? someSessions[0]?.id ?? ''),
      isRead: true, createdAt: hoursAgo(140),
    },
    {
      userId: learners[10].id, type: NotificationType.BOOKING_ACCEPTED,
      title: 'Booking accepted', body: 'Your session request was accepted — see you there!',
      link: acceptedBooking?.sessionId ? sessionLink(acceptedBooking.sessionId) : `${appUrl}/sessions`,
      isRead: true, createdAt: hoursAgo(170),
    },
    {
      userId: mentors[3].id, type: NotificationType.FEEDBACK_RECEIVED,
      title: 'New feedback received', body: 'Sophia Rossi left a review on your security session.',
      link: sessionLink(completedIds[0] ?? someSessions[0]?.id ?? ''),
      isRead: true, createdAt: hoursAgo(200),
    },
    {
      userId: learners[6].id, type: NotificationType.SYSTEM,
      title: 'Mentor application received', body: 'Thanks for applying! Our team will review your application shortly.',
      link: `${appUrl}/dashboard`, isRead: false, createdAt: hoursAgo(230),
    },
    {
      userId: learners[14].id, type: NotificationType.SESSION_REMINDER,
      title: 'Upcoming session reminder', body: 'Your "React Native new architecture" session is coming up.',
      link: sessionLink(completedIds[3] ?? someSessions[0]?.id ?? ''),
      isRead: true, createdAt: hoursAgo(265),
    },
    {
      userId: learners[1].id, type: NotificationType.SESSION_BOOKED,
      title: 'Session booked', body: 'You booked "dbt + Snowflake – analytics engineering basics".',
      link: sessionLink(someSessions[2]?.id ?? someSessions[0]?.id ?? ''),
      isRead: true, createdAt: hoursAgo(300),
    },
    {
      userId: mentors[4].id, type: NotificationType.MENTOR_APPROVED,
      title: 'Welcome to the mentor community', body: 'Your mentor profile is live. You can now host sessions.',
      link: `${appUrl}/dashboard`, isRead: true, createdAt: hoursAgo(330),
    },
  ];
  await prisma.notification.createMany({ data: notifications });

  // ── 8e. Reports — one per reason, spread across every status ─────────────
  const reportRows: Prisma.ReportCreateManyInput[] = [
    {
      reporterId: learners[0].id, reportedUserId: learners[3].id, reason: ReportReason.SPAM,
      details: 'This user keeps sending promotional DMs about an unrelated bootcamp after sessions.',
      status: ReportStatus.OPEN, createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      reporterId: learners[5].id, reportedUserId: mentors[3].id, sessionId: sessRef(0),
      reason: ReportReason.HARASSMENT,
      details: 'Felt talked down to and mocked during the session. Made me uncomfortable.',
      status: ReportStatus.UNDER_REVIEW, createdAt: new Date(now.getTime() - 4 * dayMs),
    },
    {
      reporterId: learners[7].id, reportedUserId: learners[8].id, reason: ReportReason.INAPPROPRIATE_CONTENT,
      details: 'Shared a code sample containing offensive comments and imagery.',
      status: ReportStatus.RESOLVED,
      adminNote: 'Confirmed. Content removed and user issued a formal warning.',
      resolvedById: admin.id, resolvedAt: new Date(now.getTime() - 1 * dayMs),
      createdAt: new Date(now.getTime() - 6 * dayMs),
    },
    {
      reporterId: learners[4].id, reportedUserId: mentors[2].id, sessionId: sessRef(7),
      reason: ReportReason.NO_SHOW,
      details: 'Mentor never joined the scheduled call and did not respond to messages.',
      status: ReportStatus.RESOLVED,
      adminNote: 'Verified no-show via logs. Learner refunded 1 credit; mentor notified.',
      resolvedById: admin.id, resolvedAt: new Date(now.getTime() - 3 * dayMs),
      createdAt: new Date(now.getTime() - 8 * dayMs),
    },
    {
      reporterId: learners[10].id, reportedUserId: learners[12].id, reason: ReportReason.FRAUD,
      details: 'Suspect this account is using stolen payment details / duplicate signups for free credits.',
      status: ReportStatus.UNDER_REVIEW, createdAt: new Date(now.getTime() - 5 * dayMs),
    },
    {
      reporterId: learners[13].id, reportedUserId: mentors[6].id, skillId: skills[18].id,
      reason: ReportReason.OTHER,
      details: 'Skill listing description seems misleading — advertised topics were not covered.',
      status: ReportStatus.DISMISSED,
      adminNote: 'Reviewed the listing; description matches the session scope. No action needed.',
      resolvedById: admin.id, resolvedAt: new Date(now.getTime() - 2 * dayMs),
      createdAt: new Date(now.getTime() - 7 * dayMs),
    },
  ];
  await prisma.report.createMany({ data: reportRows });

  const seededReports = await prisma.report.findMany({
    select: { id: true, status: true },
    orderBy: { createdAt: 'asc' },
  });
  const resolvedReport = seededReports.find((r) => r.status === ReportStatus.RESOLVED);
  const dismissedReport = seededReports.find((r) => r.status === ReportStatus.DISMISSED);

  // ── 8f. AuditLogs — 10 realistic admin actions with before/after JSON ────
  const auditRows: Prisma.AuditLogCreateManyInput[] = [
    {
      actorId: admin.id, action: 'user.role_change', entity: 'User', entityId: mentors[4].id,
      before: { role: Role.LEARNER, mentorStatus: MentorStatus.PENDING },
      after: { role: Role.MENTOR, mentorStatus: MentorStatus.APPROVED },
      ipAddress: '203.0.113.10', createdAt: new Date(now.getTime() - 20 * dayMs),
    },
    {
      actorId: admin.id, action: 'user.deactivate', entity: 'User', entityId: learners[3].id,
      before: { isActive: true }, after: { isActive: false },
      ipAddress: '203.0.113.10', createdAt: new Date(now.getTime() - 18 * dayMs),
    },
    {
      actorId: admin.id, action: 'credits.adjust', entity: 'User', entityId: learners[2].id,
      before: { creditBalance: 1 }, after: { creditBalance: 3 },
      ipAddress: '203.0.113.11', createdAt: new Date(now.getTime() - 15 * dayMs),
    },
    {
      actorId: admin.id, action: 'report.resolve', entity: 'Report',
      entityId: resolvedReport?.id ?? seededReports[0]?.id ?? mentors[3].id,
      before: { status: ReportStatus.OPEN }, after: { status: ReportStatus.RESOLVED },
      ipAddress: '203.0.113.11', createdAt: new Date(now.getTime() - 6 * dayMs),
    },
    {
      actorId: admin.id, action: 'user.role_change', entity: 'User', entityId: learners[9].id,
      before: { role: Role.LEARNER }, after: { role: Role.LEARNER, note: 'Application still pending' },
      ipAddress: '203.0.113.12', createdAt: new Date(now.getTime() - 12 * dayMs),
    },
    {
      actorId: admin.id, action: 'credits.adjust', entity: 'User', entityId: mentors[2].id,
      before: { creditBalance: 5 }, after: { creditBalance: 4 },
      ipAddress: '203.0.113.11', createdAt: new Date(now.getTime() - 12 * dayMs),
    },
    {
      actorId: admin.id, action: 'report.resolve', entity: 'Report',
      entityId: dismissedReport?.id ?? seededReports[0]?.id ?? mentors[6].id,
      before: { status: ReportStatus.UNDER_REVIEW }, after: { status: ReportStatus.DISMISSED },
      ipAddress: '203.0.113.12', createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      actorId: admin.id, action: 'user.deactivate', entity: 'User', entityId: learners[12].id,
      before: { isActive: true }, after: { isActive: false, reason: 'Suspected fraud — under investigation' },
      ipAddress: '203.0.113.10', createdAt: new Date(now.getTime() - 4 * dayMs),
    },
    {
      actorId: admin.id, action: 'credits.adjust', entity: 'User', entityId: learners[1].id,
      before: { creditBalance: 2 }, after: { creditBalance: 3 },
      ipAddress: '203.0.113.11', createdAt: new Date(now.getTime() - 6 * dayMs),
    },
    {
      actorId: admin.id, action: 'user.role_change', entity: 'User', entityId: learners[3].id,
      before: { role: Role.LEARNER, isActive: false }, after: { role: Role.LEARNER, isActive: true },
      ipAddress: '203.0.113.10', createdAt: new Date(now.getTime() - 1 * dayMs),
    },
  ];
  await prisma.auditLog.createMany({ data: auditRows });

  // ── 8g. Mentor applications — 3 learners awaiting review ─────────────────
  const applicants = [
    {
      idx: 6,
      headline: 'Senior Node.js engineer · 6 yrs · GraphQL & microservices',
      experience:
        'Six years building Node/Express and NestJS backends at two scale-ups. Led our GraphQL Federation migration and mentored 4 juniors. I want to give back by teaching API design and system decomposition.',
      linkedin: 'https://www.linkedin.com/in/james-taylor-eng',
    },
    {
      idx: 9,
      headline: 'Cloud & IaC practitioner · AWS SAA · Terraform',
      experience:
        'Spent the last three years running our AWS estate and codifying it with Terraform. Comfortable teaching IaC fundamentals, CI/CD pipelines and the AWS certification path from real project experience.',
      linkedin: 'https://www.linkedin.com/in/ethan-brooks-cloud',
    },
    {
      idx: 15,
      headline: 'Data-viz specialist · D3.js, Observable, Vega-Lite',
      experience:
        'I build interactive dashboards and data stories for a fintech analytics team. Deep with D3.js and modern declarative viz tools, and I love helping people move from static charts to interactive, accessible visualizations.',
      linkedin: null,
    },
  ];
  for (const a of applicants) {
    await prisma.user.update({
      where: { id: learners[a.idx].id },
      data: {
        headline: a.headline,
        mentorExperience: a.experience,
        mentorLinkedinUrl: a.linkedin,
        mentorStatus: MentorStatus.PENDING,
      },
    });
  }

  console.log(`✅ Seeded:
  • ${mentors.length} mentors
  • ${learners.length} learners
  • ${skills.length} skills
  • ${sessionData.length} sessions
  • feedback for ${completed.length} completed sessions
  • backfilled mentor ratings & totalSessionsTaught
  • ${availabilityRows.length} availability slots across 4 mentors
  • ${bookings.length} booking requests (all statuses; ${acceptedBookings.length} linked to sessions)
  • credit ledgers for 6 users (every CreditTxnType)
  • ${notifications.length} notifications (mixed types / read state)
  • ${reportRows.length} reports (every reason & status)
  • ${auditRows.length} audit-log entries
  • ${applicants.length} pending mentor applications`);

  console.log('\nCredentials (change in production!):');
  console.log('Admin     → admin@skillswap.com / Adm!n-SkillSwap-2026');
  mentors.forEach(m => console.log(`${m.email.padEnd(28)} → Mentor2026!!`));
  console.log('\nLearners  → Learner2026!!');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});