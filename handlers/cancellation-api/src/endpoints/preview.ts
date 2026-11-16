import { createRoute, z } from '@hono/zod-openapi';
import { defineSrRoute } from '@modules/routing/srApi';
import {
	cancellationResponses,
	exampleResponse,
	identityHeadersSchema,
	subscriptionPathSchema,
} from './cancellationContract';

export const previewEndpoint = defineSrRoute({
	route: createRoute({
		method: 'post',
		path: '/subscriptions/{subscriptionNumber}/preview-cancellation',
		operationId: 'previewCancellation',
		summary: 'Preview cancellation',
		description:
			'Return the predicted cancellation timing and whether a refund is planned.',
		security: [{ apiKey: [] }],
		request: {
			params: subscriptionPathSchema,
			headers: identityHeadersSchema,
			body: {
				required: true,
				content: { 'application/json': { schema: z.strictObject({}) } },
			},
		},
		responses: cancellationResponses,
	}),
	logContext: ({ params }) => params.subscriptionNumber,
	handler: () => exampleResponse,
});
