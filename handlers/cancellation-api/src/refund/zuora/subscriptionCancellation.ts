import { z } from 'zod';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const subscriptionCancellationSchema = z.object({
	status: z.string(),
	// the cancellation date when the subscription is Cancelled
	subscriptionEndDate: z.string().nullable().optional(),
	UserCancellationReason__c: z.string().nullable().optional(),
	CancellationReason__c: z.string().nullable().optional(),
});

export type SubscriptionCancellation = z.infer<
	typeof subscriptionCancellationSchema
>;

export const getSubscriptionCancellation = (
	zuoraClient: ZuoraClient,
	subscriptionNumber: SubscriptionNumber,
): Promise<SubscriptionCancellation> =>
	getSubscription(
		zuoraClient,
		subscriptionNumber,
		subscriptionCancellationSchema,
	);
