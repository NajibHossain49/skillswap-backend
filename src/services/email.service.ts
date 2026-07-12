import { Resend } from 'resend';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

const FROM_ADDRESS = config.email.from ?? 'SkillSwap <onboarding@resend.dev>';

let client: Resend | null = null;
const getClient = (): Resend => {
  if (!client) {
    client = new Resend(config.email.resendApiKey);
  }
  return client;
};

/**
 * Sends an email via Resend. This function NEVER throws — failures are logged and
 * reported through the return value so email delivery can never break a request.
 * When RESEND_API_KEY is not configured (local dev), the email is logged instead.
 */
export const sendEmail = async ({
  to,
  subject,
  html,
}: SendEmailInput): Promise<{ success: boolean }> => {
  try {
    if (!config.email.resendApiKey) {
      logger.info({ msg: 'Email (dev — RESEND_API_KEY not set)', to, subject, html });
      return { success: true };
    }

    const { error } = await getClient().emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) {
      logger.error({ msg: 'Failed to send email', to, subject, error });
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    logger.error({ msg: 'Email delivery threw', to, subject, err });
    return { success: false };
  }
};

// ---------------------------------------------------------------------------
// Templates — plain inline-CSS HTML strings (no framework).
// ---------------------------------------------------------------------------

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (date: Date | string): string => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
};

const layout = (heading: string, bodyHtml: string): string => `
  <div style="margin:0;padding:24px;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="background:#4f46e5;padding:20px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">SkillSwap</span>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">${heading}</h1>
          <div style="font-size:15px;line-height:1.6;color:#374151;">${bodyHtml}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">You are receiving this email because you have a SkillSwap account.</p>
        </td>
      </tr>
    </table>
  </div>
`;

const button = (label: string, href: string): string => `
  <p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>
  </p>
  <p style="margin:0;font-size:13px;color:#6b7280;">Or copy and paste this link into your browser:<br/><a href="${href}" style="color:#4f46e5;word-break:break-all;">${href}</a></p>
`;

export const verificationEmail = (name: string, link: string): string =>
  layout(
    'Verify your email',
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Welcome to SkillSwap! Please confirm your email address to activate your account.</p>
     ${button('Verify email', link)}
     <p style="margin-top:24px;font-size:13px;color:#6b7280;">This link expires in 24 hours.</p>`,
  );

export const passwordResetEmail = (name: string, link: string): string =>
  layout(
    'Reset your password',
    `<p>Hi ${escapeHtml(name)},</p>
     <p>We received a request to reset your SkillSwap password. Click the button below to choose a new one.</p>
     ${button('Reset password', link)}
     <p style="margin-top:24px;font-size:13px;color:#6b7280;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
  );

export const sessionBookedEmail = (
  mentorName: string,
  learnerName: string,
  sessionTitle: string,
  scheduledAt: Date | string,
  link: string,
): string =>
  layout(
    'New session booking',
    `<p>Hi ${escapeHtml(mentorName)},</p>
     <p><strong>${escapeHtml(learnerName)}</strong> just booked your session <strong>"${escapeHtml(
       sessionTitle,
     )}"</strong>.</p>
     <p style="margin:8px 0;color:#111827;"><strong>When:</strong> ${formatDateTime(scheduledAt)}</p>
     ${button('View session', link)}`,
  );

export const sessionCancelledEmail = (
  recipientName: string,
  sessionTitle: string,
  scheduledAt: Date | string,
  link: string,
): string =>
  layout(
    'Session cancelled',
    `<p>Hi ${escapeHtml(recipientName)},</p>
     <p>The session <strong>"${escapeHtml(sessionTitle)}"</strong> scheduled for
     <strong>${formatDateTime(scheduledAt)}</strong> has been cancelled.</p>
     ${button('View details', link)}`,
  );

export const sessionReminderEmail = (
  recipientName: string,
  sessionTitle: string,
  scheduledAt: Date | string,
  link: string,
): string =>
  layout(
    'Upcoming session reminder',
    `<p>Hi ${escapeHtml(recipientName)},</p>
     <p>This is a reminder that your session <strong>"${escapeHtml(sessionTitle)}"</strong> is coming up.</p>
     <p style="margin:8px 0;color:#111827;"><strong>When:</strong> ${formatDateTime(scheduledAt)}</p>
     ${button('View session', link)}`,
  );
