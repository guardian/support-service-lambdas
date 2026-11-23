import { z } from '@hono/zod-openapi';
import { identityIdSchema } from '@modules/identity/identityId';
import { apiErrorResponses } from '@modules/routing/apiGatewayHandler';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';

export const subscriptionPathSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema.openapi({
		param: { name: 'subscriptionNumber', in: 'path' },
		example: 'A-S12345678',
	}),
});

export const identityHeadersSchema = z.object({
	'x-identity-id': identityIdSchema.optional().openapi({
		description:
			'Identity ID supplied by the authenticated manage-frontend service layer. Omitted for trusted CSR/admin callers.',
		example: '123456789',
	}),
});

export const cancellationResponseSchema = z
	.discriminatedUnion('type', [
		z.strictObject({
			type: z.literal('immediate'),
			willRefund: z.boolean(),
		}),
		z.strictObject({
			type: z.literal('scheduled'),
			accessEndDate: z.iso.date(),
		}),
	])
	.openapi('CancellationResponse');

export type CancellationResponse = z.input<typeof cancellationResponseSchema>;

export const exampleResponse = {
	type: 'immediate',
	willRefund: false,
} as const;
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
};
