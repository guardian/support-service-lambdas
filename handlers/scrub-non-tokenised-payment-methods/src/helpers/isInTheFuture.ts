/**
 * True when a Zuora date, which is a plain yyyy-mm-dd with no time or zone, is
 * later than today.
 *
 * Compared as strings on purpose. That format sorts chronologically, so this
 * avoids parsing a date-only value into a Date, where it would be read as
 * midnight UTC and could land on the wrong side of the boundary.
 */
export const isInTheFuture = (zuoraDate: string): boolean =>
	zuoraDate > new Date().toISOString().slice(0, 10);
