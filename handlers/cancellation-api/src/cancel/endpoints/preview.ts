import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { logger } from '@modules/logger/logger';
import {
	type JsonRequest,
	withJsonHandler,
} from '@modules/routing/withJsonHandler';
import {
	type CancellationResponse,
	cancellationResponses,
	exampleResponse,
	identityHeadersSchema,
	subscriptionPathSchema,
} from './cancellationContract';

export function previewHandler(
	request: JsonRequest<typeof route>,
): Promise<CancellationResponse> {
	logger.log('Preview endpoint', request.body);
	return Promise.resolve(exampleResponse);
}

const route = createRoute({
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
});

export const previewEndpoint = defineOpenAPIRoute({
	route,
	handler: withJsonHandler(previewHandler),
});
