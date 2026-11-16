import { z } from '@hono/zod-openapi';
import { identityIdSchema } from '@modules/identity/identityId';
import { apiGatewayResponses } from '@modules/routing/apiGatewayErrorResponses';
import { apiErrorResponses } from '@modules/routing/srApi';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';

export const subscriptionPathSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema.openapi({
		param: { name: 'subscriptionNumber', in: 'path' },
		example: 'A-S12345678',
	}),
});

export const identityHeadersSchema = z.object({
	'x-identity-id': identityIdSchema.openapi({
		description:
			'Identity ID supplied by the authenticated manage-frontend service layer.',
		example: '123456789',
	}),
});

export const cancellationResponseSchema = z
	.discriminatedUnion('type', [
		z.strictObject({
			type: z.literal('hard'),
			willRefund: z.boolean(),
		}),
		z.strictObject({
			type: z.literal('soft'),
			accessEndDate: z.iso.date(),
		}),
	])
	.openapi('CancellationResponse');

export const exampleResponse = { type: 'hard', willRefund: false } as const;
export const cancellationResponses = {
	200: {
		description: 'Cancellation timing and whether a refund is planned.',
		content: {
			'application/json': {
				schema: cancellationResponseSchema,
				example: exampleResponse,
			},
		},
	},
	...apiErrorResponses,
	...apiGatewayResponses,
};
