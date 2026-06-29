import { logger } from '@modules/logger/logger';
import { ok } from '@modules/routing/apiGatewayResponses';
import { objectQuery } from '@modules/zuora/objectQuery';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

const availableActionSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('upsell'),
		target: z.object({
			productKey: z.string(),
			productRatePlanKey: z.string(),
		}),
	}),
	z.object({
		action: z.literal('cancel'),
	}),
]);

const meResponseSchema = z.object({
	subscriptions: z.array(
		z.object({
			name: z.string(),
			productKey: z.string(),
			productRatePlanKey: z.string(),
			availableActions: z.array(availableActionSchema),
		}),
	),
});
type MeResponse = z.infer<typeof meResponseSchema>;

export const staticResponse: MeResponse = {
	subscriptions: [
		{
			name: 'A-S12345678',
			productKey: 'SupporterPlus',
			productRatePlanKey: 'Annual',
			availableActions: [
				{
					action: 'upsell',
					target: {
						productKey: 'DigitalSubscription',
						productRatePlanKey: 'Annual',
					},
				},
				{
					action: 'cancel',
				},
			],
		},
	],
};

export class MeEndpoint {
	constructor(private readonly zuoraClient: ZuoraClient) {}
	async handle(identityId: string): Promise<APIGatewayProxyResult> {
		const userSubscriptions = await objectQuery.accounts.execute(
			this.zuoraClient,
			['id', 'name', 'accountNumber', 'balance'],
			['subscriptions.rateplans'],
			[{ field: 'IdentityId__c', operator: 'EQ', value: identityId }],
			99,
		);
		logger.log('query result for userSubscriptions', userSubscriptions);
		// to do in next PR - actually use the result to produce the response
		return Promise.resolve(ok(staticResponse, meResponseSchema));
	}
}
