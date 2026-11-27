import type dayjs from 'dayjs';
import { logger } from '@modules/logger/logger';
import type { QueryInput, QueryOutput } from './stepData';
import { billingDateFor, today } from './stepData';

export type QueryServices = {
	submitQuery: (name: string, query: string) => Promise<{ id: string }>;
};

// Every charge billing on the date; a subscription has a row per charge, so the results are deduplicated afterwards
export const reminderQuery = (billingDate: string) =>
	`SELECT Subscription.Name, Account.AccountNumber FROM RatePlanCharge WHERE ChargedThroughDate = '${billingDate}' AND Subscription.Status = 'Active' AND Subscription.AutoRenew = true AND SoldToContact.Country = 'United Kingdom'`;

export async function queryZuora(
	input: QueryInput,
	now: dayjs.Dayjs,
	services: QueryServices,
): Promise<QueryOutput> {
	const date = input.date ?? today(now);
	const billingDate = billingDateFor(date);
	const job = await services.submitQuery(
		`email-reminders-${billingDate}`,
		reminderQuery(billingDate),
	);
	logger.log(
		`submitted query ${job.id} for ${date}, billing date ${billingDate}`,
	);
	return { jobId: job.id, billingDate };
}
