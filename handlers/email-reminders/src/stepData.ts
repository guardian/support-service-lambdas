import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';
import {
	accountNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';

dayjs.extend(utc);
dayjs.extend(timezone);

export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)');

export const daysBeforeBilling = 14;

export const today = (now: dayjs.Dayjs): string =>
	now.tz('Europe/London').format('YYYY-MM-DD');

export const billingDateFor = (date: string): string =>
	dayjs.utc(date).add(daysBeforeBilling, 'day').format('YYYY-MM-DD');

// Data passed between the state machine steps, see cdk/lib/email-reminders.ts

// The date to process, defaulting to today; set it to re-run a day. Subscriptions billing daysBeforeBilling later are processed
export const queryInputSchema = z.object({
	date: isoDateSchema.optional(),
});
export type QueryInput = z.infer<typeof queryInputSchema>;

export const queryOutputSchema = z.object({
	jobId: z.string().min(1),
	billingDate: isoDateSchema,
});
export type QueryOutput = z.infer<typeof queryOutputSchema>;

export type FetchOutput = {
	billingDate: string;
	key: string;
	count: number;
};

// One item per subscription, read from S3 by the map state
export const subscriptionItemSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountNumber: accountNumberSchema,
});
export type SubscriptionItem = z.infer<typeof subscriptionItemSchema>;

export const processorInputSchema = subscriptionItemSchema.extend({
	billingDate: isoDateSchema,
});
export type ProcessorInput = z.infer<typeof processorInputSchema>;
