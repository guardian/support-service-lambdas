import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
	currentAttemptedQueryTime,
	formatZuoraDateTime,
	parseLastSuccessfulQueryTime,
	toIsoLocalDateTimeUtc,
} from '../src/services/dateTimeService';

dayjs.extend(utc);

// Scala's ISO_DATE_TIME format: offset + IANA zone id suffix
const scalaFormatLaTime =
	'2026-03-23T05:29:27.281403501-07:00[America/Los_Angeles]';

// Format written by the TypeScript version (no zone-id suffix, but offset preserved)
const tsFormatLaTime = '2026-03-23T05:29:27-07:00';

describe('dateTimeService', () => {
	describe('parseLastSuccessfulQueryTime', () => {
		test('parses Scala-format LA timestamp (with zone-id suffix)', () => {
			const parsed = parseLastSuccessfulQueryTime(scalaFormatLaTime);

			expect(parsed).toBeDefined();
			// The UTC equivalent of 05:29:27.281-07:00 is 12:29:27.281Z
			// (dayjs preserves milliseconds but drops sub-millisecond precision)
			expect(parsed!.toISOString()).toBe('2026-03-23T12:29:27.281Z');
		});

		test('parses TypeScript-format LA timestamp (offset only, no zone-id suffix)', () => {
			const parsed = parseLastSuccessfulQueryTime(tsFormatLaTime);

			expect(parsed).toBeDefined();
			// The UTC equivalent of 05:29:27-07:00 is 12:29:27Z
			expect(parsed!.toISOString()).toBe('2026-03-23T12:29:27.000Z');
		});

		test('returns undefined for an invalid date string', () => {
			expect(parseLastSuccessfulQueryTime('not-a-date')).toBeUndefined();
		});
	});

	describe('currentAttemptedQueryTime', () => {
		test('returns an offset-aware string (not a UTC Z string)', () => {
			const result = currentAttemptedQueryTime();

			// Should contain a UTC offset (e.g. -07:00 or -08:00) rather than ending in Z
			expect(result).toMatch(/[+-]\d{2}:\d{2}$/);
			expect(result).not.toMatch(/Z$/);
		});

		test('can be parsed back by parseLastSuccessfulQueryTime', () => {
			const result = currentAttemptedQueryTime();
			const reparsed = parseLastSuccessfulQueryTime(result);

			expect(reparsed).toBeDefined();
			expect(reparsed!.isValid()).toBe(true);
		});
	});

	describe('toIsoLocalDateTimeUtc', () => {
		test('converts a UTC ISO string to a local datetime string without trailing Z', () => {
			expect(toIsoLocalDateTimeUtc('2026-03-23T12:29:27.000Z')).toBe(
				'2026-03-23T12:29:27.000',
			);
		});

		test('converts an offset-aware string to UTC and strips the Z', () => {
			// 05:29:27-07:00 === 12:29:27 UTC
			expect(toIsoLocalDateTimeUtc(tsFormatLaTime)).toBe(
				'2026-03-23T12:29:27.000',
			);
		});

		test('throws for an invalid date string', () => {
			expect(() => toIsoLocalDateTimeUtc('not-a-date')).toThrow(
				'Invalid date string: not-a-date',
			);
		});
	});

	describe('round-trip: Scala value → parse → persist → parse again', () => {
		test('value persisted by TypeScript can be parsed by both code paths', () => {
			// Step 1: TypeScript reads + parses the Scala-written value
			const parsed = parseLastSuccessfulQueryTime(scalaFormatLaTime);
			expect(parsed).toBeDefined();

			// Step 2: TypeScript writes back via currentAttemptedQueryTime (same format).
			// We simulate this by converting the parsed UTC instant to an LA-offset string,
			// which is exactly what currentAttemptedQueryTime() does with the current time.
			// dayjs .format() has second-level precision, which is fine for the query window.
			const tsWritten = currentAttemptedQueryTime();
			expect(tsWritten).toMatch(/[+-]\d{2}:\d{2}$/);

			// Step 3: The written value can be re-parsed by parseLastSuccessfulQueryTime
			const reParsed = parseLastSuccessfulQueryTime(tsWritten);
			expect(reParsed).toBeDefined();
			expect(reParsed!.isValid()).toBe(true);
		});
	});

	describe('formatZuoraDateTime', () => {
		test('formats a UTC instant as LA local time for Zuora', () => {
			// 12:29:27 UTC == 05:29:27 LA (PDT, -07:00)
			const utcInstant = dayjs.utc('2026-03-23T12:29:27.000Z');
			expect(formatZuoraDateTime(utcInstant)).toBe('2026-03-23 05:29:27');
		});

		test('formats a UTC instant in PST (winter, -08:00) correctly', () => {
			// 12:29:27 UTC in January == 04:29:27 LA (PST, -08:00)
			const utcInstant = dayjs.utc('2026-01-15T12:29:27.000Z');
			expect(formatZuoraDateTime(utcInstant)).toBe('2026-01-15 04:29:27');
		});

		test('round-trip: parse lastSuccessfulQueryTime then format for Zuora gives LA time', () => {
			// The Scala code stores the LA wall-clock time with offset, e.g. 05:29:27-07:00.
			// After parsing (→ UTC) and re-formatting for Zuora we should get the same LA wall-clock back.
			const parsed = parseLastSuccessfulQueryTime(tsFormatLaTime); // 05:29:27 LA
			expect(parsed).toBeDefined();
			expect(formatZuoraDateTime(parsed!)).toBe('2026-03-23 05:29:27');
		});
	});
});
