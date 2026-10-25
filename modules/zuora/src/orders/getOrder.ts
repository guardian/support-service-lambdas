import dayjs from 'dayjs';
import { z } from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

// https://developer.zuora.com/v1-api-reference/api/orders/get_order
// Only the fields this module needs are modelled here.
const orderActionSchema = z.object({
	type: z.string(),
	cancelSubscription: z
		.object({
			cancellationEffectiveDate: z.string().transform((arg) => dayjs(arg)),
		})
		.optional(),
});

const orderSubscriptionSchema = z.object({
	subscriptionNumber: z.string(),
	orderActions: z.array(orderActionSchema),
});

export const getOrderResponseSchema = z.object({
	success: z.boolean(),
	order: z.object({
		orderNumber: z.string(),
		subscriptions: z.array(orderSubscriptionSchema),
	}),
});

export type GetOrderResponse = z.infer<typeof getOrderResponseSchema>;

export const getOrder = (
	zuoraClient: ZuoraClient,
	orderNumber: string,
): Promise<GetOrderResponse> => {
	const path = `/v1/orders/${orderNumber}`;
	return zuoraClient.get(path, getOrderResponseSchema);
};
