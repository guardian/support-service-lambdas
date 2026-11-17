import { createRoute, z } from '@hono/zod-openapi';
import { defineSrRoute } from '@modules/routing/srApi';
import {
	cancellationResponses,
	exampleResponse,
	identityHeadersSchema,
	subscriptionPathSchema,
} from './cancellationContract';

export const cancelEndpoint = defineSrRoute({
	route: createRoute({
		method: 'post',
		path: '/subscriptions/{subscriptionNumber}/cancel',
		operationId: 'cancelSubscription',
		summary: 'Cancel subscription',
		description:
			'Cancel the subscription and return its intended cancellation timing and whether a refund is planned.',
		security: [{ apiKey: [] }],
		request: {
			params: subscriptionPathSchema,
			headers: identityHeadersSchema,
			body: {
				required: true,
				content: {
					'application/json': {
						schema: z.strictObject({
							reason: z.string().trim().min(1).optional(),
						}),
					},
				},
			},
		},
		responses: cancellationResponses,
	}),
	logContext: ({ params }) => params.subscriptionNumber,
	handler: () => exampleResponse,
});
