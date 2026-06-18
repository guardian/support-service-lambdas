import { zuoraIdSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { z } from 'zod';
import type { SubscriptionName } from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export type SubscriptionId = string & { readonly __brand: 'SubscriptionId' };

export type OrderId = string & { readonly __brand: 'OrderId' };

export type SubscriptionVersionAmendmentId = string & {
	readonly __brand: 'SubscriptionVersionAmendmentId';
};

const schema = z.object({
	data: z.array(
		z.object({
			id: zuoraIdSchema<SubscriptionId>(),
			orderId: zuoraIdSchema<OrderId>().optional(),
			subscriptionVersionAmendmentId:
				zuoraIdSchema<SubscriptionVersionAmendmentId>().optional(),
		}),
	),
});

export function objectQuerySubscriptions(
	zuoraClient: ZuoraClient,
	subscriptionName: SubscriptionName,
) {
	const params = new URLSearchParams({
		pageSize: '99',
		'sort[]': 'version.ASC',
		'filter[]': 'name.EQ:' + subscriptionName,
		'fields[]': 'id,subscriptionVersionAmendmentId,orderId',
		includeNullFields: 'false',
	});
	const queryString = params.toString();
	const path = `/object-query/subscriptions?${queryString}`;
	return zuoraClient.get(path, schema);
}
