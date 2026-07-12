import { sessionService } from '../modules/sessions/session.service';

/**
 * Close out SCHEDULED sessions whose end time passed more than 24h ago and
 * settle the held credits to the mentor.
 */
export async function autoCompleteSessions(): Promise<Record<string, unknown>> {
  return sessionService.autoCompleteStaleSessions(24);
}
