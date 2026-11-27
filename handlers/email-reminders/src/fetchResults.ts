import { logger } from '@modules/logger/logger';
import type { BatchQueryJob } from '@modules/zuora/batchQuery';
import type { FetchOutput, QueryOutput, SubscriptionItem } from './stepData';
import { subscriptionItemSchema } from './stepData';

export type FetchServices = {
	getJob: (jobId: string) => Promise<BatchQueryJob>;
	getFile: (fileId: string) => Promise<string>;
	putFile: (key: string, body: string) => Promise<void>;
};

// The state machine retries on this error name until the query completes
export class QueryNotCompleteError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'QueryNotCompleteError';
	}
}

const inProgressStatuses = ['submitted', 'pending', 'executing'];

export async function fetchResults(
	{ jobId, billingDate }: QueryOutput,
	services: FetchServices,
): Promise<FetchOutput> {
	const job = await services.getJob(jobId);
	if (inProgressStatuses.includes(job.status)) {
		throw new QueryNotCompleteError(`query ${jobId} is ${job.status}`);
	}
	const batch = job.batches[0];
	if (job.status !== 'completed' || batch?.fileId === undefined) {
		throw new Error(`query ${jobId} failed: ${JSON.stringify(job)}`);
	}
	const items = parseSubscriptions(await services.getFile(batch.fileId));
	const key = `${billingDate}/${jobId}.json`;
	await services.putFile(key, JSON.stringify(items));
	logger.log(
		`wrote ${items.length} subscriptions (${batch.recordCount} charges) to ${key}`,
	);
	return { billingDate, key, count: items.length };
}

const unquote = (value: string) => value.trim().replace(/^"(.*)"$/, '$1');

// The query returns a row per charge, so a subscription can appear several times
export function parseSubscriptions(csv: string): SubscriptionItem[] {
	const [header, ...rows] = csv
		.split(/\r?\n/)
		.filter((line) => line.trim() !== '');
	const columns = (header ?? '').split(',').map(unquote);
	const subscriptionColumn = columns.indexOf('Subscription.Name');
	const accountColumn = columns.indexOf('Account.AccountNumber');
	if (subscriptionColumn === -1 || accountColumn === -1) {
		throw new Error(`unexpected query result columns: ${header}`);
	}
	const bySubscription = new Map<string, SubscriptionItem>();
	for (const row of rows) {
		const values = row.split(',').map(unquote);
		const item = subscriptionItemSchema.parse({
			subscriptionNumber: values[subscriptionColumn],
			accountNumber: values[accountColumn],
		});
		bySubscription.set(item.subscriptionNumber, item);
	}
	return [...bySubscription.values()];
}
