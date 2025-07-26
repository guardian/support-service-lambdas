import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	ZuoraSuccessResponse,
	zuoraSuccessResponseSchema,
} from '@modules/zuora/zuoraSchemas';
import { OrderRequest } from '@modules/zuora/orders/orders';

export const createSubscription = async (
	zuoraClient: ZuoraClient,
	createSubscriptionRequest: OrderRequest,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/orders`;
	const body = JSON.stringify(createSubscriptionRequest);
	return zuoraClient.post(path, body, zuoraSuccessResponseSchema, {
		'zuora-version': '211.0',
	});
};
