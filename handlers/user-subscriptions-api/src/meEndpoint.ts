import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
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

const staticResponse: MeResponse = {
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

export function handleMeEndpoint(): Promise<APIGatewayProxyResult> {
	try {
		return Promise.resolve(ok(staticResponse, meResponseSchema));
	} catch (e) {
		return Promise.resolve(buildErrorResponse(e));
	}
}
