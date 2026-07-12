import { sessionService } from '../modules/sessions/session.service';

/**
 * Notify both parties of SCHEDULED sessions starting in ~1 hour. Idempotent via
 * Session.reminderSentAt.
 */
export async function sessionReminders(): Promise<Record<string, unknown>> {
  return sessionService.sendDueReminders();
}
