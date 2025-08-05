import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { OrderRequest } from '@modules/zuora/orders/orders';
import { z } from 'zod';

const createSubscriptionResponseSchema = z.object({
	orderNumber: z.string(),
	accountNumber: z.string(),
	subscriptionNumbers: z.array(z.string()),
});

type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>;

export const createSubscription = async (
	zuoraClient: ZuoraClient,
	createSubscriptionRequest: OrderRequest,
): Promise<CreateSubscriptionResponse> => {
	const path = `/v1/orders`;
	const body = JSON.stringify(createSubscriptionRequest);
	return zuoraClient.post(path, body, createSubscriptionResponseSchema, {
		'zuora-version': '211.0',
	});
};
