import { bookingService } from '../modules/bookings/booking.service';

/**
 * Expire PENDING booking requests whose proposed time has passed, refunding any
 * held credits.
 */
export async function expireStaleBookings(): Promise<Record<string, unknown>> {
  return bookingService.expireStalePendingRequests();
}
