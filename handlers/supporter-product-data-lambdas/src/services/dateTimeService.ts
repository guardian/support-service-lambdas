import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const laTimezone = 'America/Los_Angeles';

/**
 * Parses a lastSuccessfulQueryTime string from SSM parameter store.
 * Accepts both the Scala format (e.g. '2026-03-23T05:29:27.281403501-07:00[America/Los_Angeles]')
 * and the TypeScript format (e.g. '2026-03-23T05:29:27-07:00').
 * Returns a UTC dayjs instance, or undefined if the string cannot be parsed.
 */
export const parseLastSuccessfulQueryTime = (
	value: string,
): dayjs.Dayjs | undefined => {
	// Strip the IANA zone-id suffix (e.g. [America/Los_Angeles]) written by the Scala
	// version's ISO_DATE_TIME formatter — dayjs doesn't understand that part
	const normalised = value.replace(/\[.*]$/, '');
	const parsed = dayjs.utc(normalised);
	return parsed.isValid() ? parsed : undefined;
};

/**
 * Returns the current time in the America/Los_Angeles timezone minus one minute,
 * formatted as an offset-aware ISO string (e.g. '2026-03-23T05:29:00-07:00').
 * The offset is preserved so the value round-trips correctly when read back by
 * both the TypeScript and Scala versions of the step function.
 */
export const currentAttemptedQueryTime = (): string =>
	dayjs().tz(laTimezone).subtract(1, 'minute').format();

/**
 * Formats a dayjs instance as a Zuora-compatible datetime string in the
 * America/Los_Angeles timezone (e.g. '2026-03-23 05:29:27').
 * Zuora interprets the incrementalTime field as an LA local time regardless of
 * the dateTimeUtc flag (which only affects response output, not input parsing).
 */
export const formatZuoraDateTime = (date: dayjs.Dayjs): string =>
	date.tz(laTimezone).format('YYYY-MM-DD HH:mm:ss');

/**
 * Converts an ISO datetime string to a UTC local datetime string suitable for use
 * in S3 filenames (e.g. '2026-03-23T12:29:27.000' — no trailing Z).
 * Throws if the string cannot be parsed as a valid date.
 */
export const toIsoLocalDateTimeUtc = (isoString: string): string => {
	const parsed = dayjs.utc(isoString);
	if (!parsed.isValid()) {
		throw new Error(`Invalid date string: ${isoString}`);
	}
	return parsed.toISOString().replace('Z', '');
};
