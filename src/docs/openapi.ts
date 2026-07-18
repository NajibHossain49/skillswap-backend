import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from '../modules/auth/auth.schema';
import { updateProfileSchema, updateUserRoleSchema } from '../modules/users/user.schema';
import { createSkillSchema, updateSkillSchema } from '../modules/skills/skill.schema';
import { createSessionSchema, updateSessionStatusSchema, bookSessionSchema, createFeedbackSchema } from '../modules/sessions/session.schema';
import { createBookingSchema, rejectBookingSchema } from '../modules/bookings/booking.schema';
import { createReportSchema, resolveReportSchema } from '../modules/reports/report.schema';
import { applyMentorSchema, reviewApplicationSchema } from '../modules/mentors/mentor.schema';
import { adminAdjustSchema } from '../modules/credits/credit.schema';

// Adds the `.openapi()` helper to Zod. Safe to call once at module load.
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const bearer = [{ bearerAuth: [] as string[] }];

// Register the EXISTING request-body Zod schemas as reusable components so the
// spec always mirrors the real validation rules.
const components = {
  RegisterInput: registry.register('RegisterInput', registerSchema),
  LoginInput: registry.register('LoginInput', loginSchema),
  RefreshInput: registry.register('RefreshInput', refreshTokenSchema),
  ChangePasswordInput: registry.register('ChangePasswordInput', changePasswordSchema),
  ForgotPasswordInput: registry.register('ForgotPasswordInput', forgotPasswordSchema),
  ResetPasswordInput: registry.register('ResetPasswordInput', resetPasswordSchema),
  VerifyEmailInput: registry.register('VerifyEmailInput', verifyEmailSchema),
  UpdateProfileInput: registry.register('UpdateProfileInput', updateProfileSchema),
  UpdateUserRoleInput: registry.register('UpdateUserRoleInput', updateUserRoleSchema),
  CreateSkillInput: registry.register('CreateSkillInput', createSkillSchema),
  UpdateSkillInput: registry.register('UpdateSkillInput', updateSkillSchema),
  CreateSessionInput: registry.register('CreateSessionInput', createSessionSchema),
  UpdateSessionStatusInput: registry.register('UpdateSessionStatusInput', updateSessionStatusSchema),
  BookSessionInput: registry.register('BookSessionInput', bookSessionSchema),
  CreateFeedbackInput: registry.register('CreateFeedbackInput', createFeedbackSchema),
  CreateBookingInput: registry.register('CreateBookingInput', createBookingSchema),
  RejectBookingInput: registry.register('RejectBookingInput', rejectBookingSchema),
  CreateReportInput: registry.register('CreateReportInput', createReportSchema),
  ResolveReportInput: registry.register('ResolveReportInput', resolveReportSchema),
  ApplyMentorInput: registry.register('ApplyMentorInput', applyMentorSchema),
  ReviewApplicationInput: registry.register('ReviewApplicationInput', reviewApplicationSchema),
  AdminAdjustInput: registry.register('AdminAdjustInput', adminAdjustSchema),
};

// Standard envelope every controller returns (see utils/response.ts).
const ApiResponse = registry.register(
  'ApiResponse',
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.unknown().optional(),
    errors: z.unknown().optional(),
  }),
);

type ZodAny = z.ZodTypeAny;

const jsonBody = (schema: ZodAny) => ({
  content: { 'application/json': { schema } },
});

const ok = (description: string) => ({
  description,
  content: { 'application/json': { schema: ApiResponse } },
});

// The standard envelope with a typed `data` payload, for routes whose response
// shape we want the spec to describe precisely.
const okData = (description: string, data: ZodAny) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        success: z.boolean(),
        message: z.string(),
        data,
        errors: z.unknown().optional(),
      }),
    },
  },
});

const errorResponses = {
  400: { description: 'Validation error' },
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' },
  404: { description: 'Not found' },
};

// Doc-only query params (the real query schemas use transforms that don't map
// cleanly to OpenAPI). These describe the pagination contract accurately.
const pageParam = z.string().optional().openapi({ param: { name: 'page', in: 'query' }, example: '1' });
const limitParam = z.string().optional().openapi({ param: { name: 'limit', in: 'query' }, example: '20' });
const idParam = z.string().openapi({ param: { name: 'id', in: 'path' }, example: '00000000-0000-0000-0000-000000000000' });

const paginationQuery = z.object({ page: pageParam, limit: limitParam });

// ─────────────────────────── Auth ───────────────────────────
registry.registerPath({ method: 'post', path: '/api/auth/register', tags: ['Auth'], summary: 'Register a new account (LEARNER)', request: { body: jsonBody(components.RegisterInput) }, responses: { 201: ok('Registered'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/auth/login', tags: ['Auth'], summary: 'Login and receive a token pair', request: { body: jsonBody(components.LoginInput) }, responses: { 200: ok('Logged in'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/auth/refresh', tags: ['Auth'], summary: 'Rotate refresh token', request: { body: jsonBody(components.RefreshInput) }, responses: { 200: ok('Refreshed'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/auth/logout', tags: ['Auth'], summary: 'Revoke a refresh token', request: { body: jsonBody(components.RefreshInput) }, responses: { 200: ok('Logged out') } });
registry.registerPath({ method: 'post', path: '/api/auth/logout-all', tags: ['Auth'], summary: 'Revoke all sessions', security: bearer, responses: { 200: ok('Logged out everywhere'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/auth/me', tags: ['Auth'], summary: 'Current token identity', security: bearer, responses: { 200: ok('Identity'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/auth/change-password', tags: ['Auth'], summary: 'Change password (revokes sessions)', security: bearer, request: { body: jsonBody(components.ChangePasswordInput) }, responses: { 200: ok('Password changed'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/auth/forgot-password', tags: ['Auth'], summary: 'Request a reset link', request: { body: jsonBody(components.ForgotPasswordInput) }, responses: { 200: ok('Sent (generic)') } });
registry.registerPath({ method: 'post', path: '/api/auth/reset-password', tags: ['Auth'], summary: 'Reset password with a token', request: { body: jsonBody(components.ResetPasswordInput) }, responses: { 200: ok('Password reset'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/auth/verify-email', tags: ['Auth'], summary: 'Verify email with a token', request: { body: jsonBody(components.VerifyEmailInput) }, responses: { 200: ok('Verified'), ...errorResponses } });

// ─────────────────────────── Users ───────────────────────────
registry.registerPath({ method: 'get', path: '/api/users/profile', tags: ['Users'], summary: 'Get my profile', security: bearer, responses: { 200: ok('Profile'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/users/profile', tags: ['Users'], summary: 'Update my profile', security: bearer, request: { body: jsonBody(components.UpdateProfileInput) }, responses: { 200: ok('Updated'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/users', tags: ['Users'], summary: 'List users (ADMIN)', security: bearer, request: { query: paginationQuery }, responses: { 200: ok('Users'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/users/{id}', tags: ['Users'], summary: 'Get user by id (ADMIN)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('User'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/users/{id}/role', tags: ['Users'], summary: 'Change role (ADMIN)', security: bearer, request: { params: z.object({ id: idParam }), body: jsonBody(components.UpdateUserRoleInput) }, responses: { 200: ok('Role updated'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/users/{id}/deactivate', tags: ['Users'], summary: 'Deactivate user (ADMIN)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Deactivated'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/users/{id}/activate', tags: ['Users'], summary: 'Activate user (ADMIN)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Activated'), ...errorResponses } });
registry.registerPath({ method: 'delete', path: '/api/users/{id}', tags: ['Users'], summary: 'Soft-delete user (ADMIN)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Deleted'), ...errorResponses } });

// ─────────────────────────── Skills ───────────────────────────
registry.registerPath({ method: 'get', path: '/api/skills', tags: ['Skills'], summary: 'List skills', request: { query: paginationQuery }, responses: { 200: ok('Skills') } });
registry.registerPath({ method: 'get', path: '/api/skills/categories', tags: ['Skills'], summary: 'List categories (cached 60s)', responses: { 200: ok('Categories') } });
registry.registerPath({ method: 'get', path: '/api/skills/{id}', tags: ['Skills'], summary: 'Get skill', request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Skill'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/skills', tags: ['Skills'], summary: 'Create skill (approved MENTOR/ADMIN)', security: bearer, request: { body: jsonBody(components.CreateSkillInput) }, responses: { 201: ok('Created'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/skills/{id}', tags: ['Skills'], summary: 'Update skill (owner/ADMIN)', security: bearer, request: { params: z.object({ id: idParam }), body: jsonBody(components.UpdateSkillInput) }, responses: { 200: ok('Updated'), ...errorResponses } });
registry.registerPath({ method: 'delete', path: '/api/skills/{id}', tags: ['Skills'], summary: 'Delete skill (owner/ADMIN)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Deleted'), ...errorResponses } });

// ─────────────────────────── Sessions ───────────────────────────
registry.registerPath({ method: 'get', path: '/api/sessions', tags: ['Sessions'], summary: 'List sessions', security: bearer, request: { query: paginationQuery }, responses: { 200: ok('Sessions'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/sessions', tags: ['Sessions'], summary: 'Create session (approved MENTOR/ADMIN)', security: bearer, request: { body: jsonBody(components.CreateSessionInput) }, responses: { 201: ok('Created'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/sessions/{id}', tags: ['Sessions'], summary: 'Get session', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Session'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/sessions/{id}/book', tags: ['Sessions'], summary: 'Book an open session (LEARNER)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Booked'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/sessions/{id}/status', tags: ['Sessions'], summary: 'Update session status', security: bearer, request: { params: z.object({ id: idParam }), body: jsonBody(components.UpdateSessionStatusInput) }, responses: { 200: ok('Updated'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/sessions/{id}/feedback', tags: ['Sessions'], summary: 'Leave feedback (LEARNER)', security: bearer, request: { params: z.object({ id: idParam }), body: jsonBody(components.CreateFeedbackInput) }, responses: { 201: ok('Feedback saved'), ...errorResponses } });

// ─────────────────────────── Bookings ───────────────────────────
registry.registerPath({ method: 'get', path: '/api/bookings', tags: ['Bookings'], summary: 'List booking requests', security: bearer, request: { query: paginationQuery }, responses: { 200: ok('Requests'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/bookings', tags: ['Bookings'], summary: 'Create a booking request (LEARNER)', security: bearer, request: { body: jsonBody(components.CreateBookingInput) }, responses: { 201: ok('Created'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/bookings/{id}/accept', tags: ['Bookings'], summary: 'Accept request (MENTOR)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Accepted'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/bookings/{id}/reject', tags: ['Bookings'], summary: 'Reject request (MENTOR)', security: bearer, request: { params: z.object({ id: idParam }), body: jsonBody(components.RejectBookingInput) }, responses: { 200: ok('Rejected'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/bookings/{id}/cancel', tags: ['Bookings'], summary: 'Cancel request (LEARNER)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Cancelled'), ...errorResponses } });

// ─────────────────────────── Mentors ───────────────────────────
// Public mentor projections. These deliberately expose the relation as `skills`
// (never the internal `createdSkills`) and never include email or password.
const MentorSkill = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  level: z.string(),
});

const MentorPublic = registry.register(
  'MentorPublic',
  z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
    headline: z.string().nullable(),
    bio: z.string().nullable(),
    location: z.string().nullable(),
    ratingAvg: z.number(),
    ratingCount: z.number(),
    totalSessionsTaught: z.number(),
    skills: z.array(MentorSkill),
  }),
);

const MentorReview = z.object({
  id: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
  learner: z.object({ id: z.string(), name: z.string(), avatarUrl: z.string().nullable() }),
  session: z.object({
    id: z.string(),
    title: z.string(),
    skill: z.object({ id: z.string(), title: z.string() }).nullable(),
  }),
});

const MentorDetail = registry.register(
  'MentorDetail',
  MentorPublic.extend({
    createdAt: z.string(),
    recentReviews: z.array(MentorReview),
  }),
);

const MentorList = z.object({
  mentors: z.array(MentorPublic),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

registry.registerPath({ method: 'get', path: '/api/mentors', tags: ['Mentors'], summary: 'Public mentor discovery', request: { query: paginationQuery }, responses: { 200: okData('Mentors', MentorList) } });
registry.registerPath({ method: 'get', path: '/api/mentors/{id}', tags: ['Mentors'], summary: 'Public mentor profile', request: { params: z.object({ id: idParam }) }, responses: { 200: okData('Mentor', MentorDetail), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/mentors/apply', tags: ['Mentors'], summary: 'Apply to become a mentor', security: bearer, request: { body: jsonBody(components.ApplyMentorInput) }, responses: { 200: ok('Application submitted'), ...errorResponses } });

// ─────────────────────────── Credits ───────────────────────────
registry.registerPath({ method: 'get', path: '/api/credits/balance', tags: ['Credits'], summary: 'My credit balance', security: bearer, responses: { 200: ok('Balance'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/credits/transactions', tags: ['Credits'], summary: 'My credit ledger', security: bearer, request: { query: paginationQuery }, responses: { 200: ok('Transactions'), ...errorResponses } });

// ─────────────────────────── Reports ───────────────────────────
registry.registerPath({ method: 'post', path: '/api/reports', tags: ['Reports'], summary: 'File a report', security: bearer, request: { body: jsonBody(components.CreateReportInput) }, responses: { 201: ok('Filed'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/reports', tags: ['Reports'], summary: 'List reports (ADMIN)', security: bearer, request: { query: paginationQuery }, responses: { 200: ok('Reports'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/reports/{id}', tags: ['Reports'], summary: 'Get report (ADMIN)', security: bearer, request: { params: z.object({ id: idParam }) }, responses: { 200: ok('Report'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/reports/{id}/resolve', tags: ['Reports'], summary: 'Resolve report (ADMIN)', security: bearer, request: { params: z.object({ id: idParam }), body: jsonBody(components.ResolveReportInput) }, responses: { 200: ok('Resolved'), ...errorResponses } });

// ─────────────────────────── Admin ───────────────────────────
registry.registerPath({ method: 'get', path: '/api/admin/dashboard', tags: ['Admin'], summary: 'Dashboard stats (cached 60s)', security: bearer, responses: { 200: ok('Stats'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/admin/audit-logs', tags: ['Admin'], summary: 'Audit trail', security: bearer, request: { query: paginationQuery }, responses: { 200: ok('Logs'), ...errorResponses } });
registry.registerPath({ method: 'post', path: '/api/admin/credits/adjust', tags: ['Admin'], summary: 'Adjust a user balance', security: bearer, request: { body: jsonBody(components.AdminAdjustInput) }, responses: { 200: ok('Adjusted'), ...errorResponses } });
registry.registerPath({ method: 'get', path: '/api/admin/mentor-applications', tags: ['Admin'], summary: 'List mentor applications', security: bearer, request: { query: paginationQuery }, responses: { 200: ok('Applications'), ...errorResponses } });
registry.registerPath({ method: 'patch', path: '/api/admin/mentor-applications/{userId}', tags: ['Admin'], summary: 'Approve/reject a mentor application', security: bearer, request: { params: z.object({ userId: z.string().openapi({ param: { name: 'userId', in: 'path' } }) }), body: jsonBody(components.ReviewApplicationInput) }, responses: { 200: ok('Reviewed'), ...errorResponses } });

// ─────────────────────────── Internal ───────────────────────────
registry.registerPath({ method: 'post', path: '/api/internal/cron/{job}', tags: ['Internal'], summary: 'Invoke a scheduled job (x-cron-secret)', request: { params: z.object({ job: z.string().openapi({ param: { name: 'job', in: 'path' }, example: 'sessionReminders' }) }) }, responses: { 200: ok('Executed'), 401: { description: 'Invalid cron secret' }, 404: { description: 'Unknown job' } } });

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'SkillSwap API',
      version: '1.0.0',
      description:
        'One-way skill-booking platform with a credit economy, mentor approval, moderation and scheduled jobs.',
    },
    servers: [{ url: '/' }],
  });
}
