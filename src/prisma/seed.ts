import { Role, SessionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from './client';

async function main() {
  console.log('🌱 Starting large realistic seed — current date: February 22, 2026');

  const hash = async (pw: string) => bcrypt.hash(pw, 12);

  // ── 1. Admin (unchanged) ────────────────────────────────────────────────
  await prisma.user.upsert({
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

  console.log(`✅ Seeded:
  • ${mentors.length} mentors
  • ${learners.length} learners
  • ${skills.length} skills
  • ${sessionData.length} sessions
  • feedback for ${completed.length} completed sessions`);

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