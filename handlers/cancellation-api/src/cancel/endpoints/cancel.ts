import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { logger } from '@modules/logger/logger';
import {
	type JsonRequest,
	withJsonHandler,
} from '@modules/routing/withJsonHandler';
import type { CancellationServices } from '..';
import {
	type CancellationResponse,
	cancellationResponses,
	exampleResponse,
	identityHeadersSchema,
	subscriptionPathSchema,
} from './cancellationContract';

export function cancelHandler(
	_services: CancellationServices,
	request: JsonRequest<typeof route>,
): Promise<CancellationResponse> {
	logger.log('cancel endpoint', request.body);
	return Promise.resolve(exampleResponse);
}

const route = createRoute({
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
});

export const cancelEndpoint = defineOpenAPIRoute({
	route,
	handler: withJsonHandler(cancelHandler),
});
