import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { ValidationError } from '@modules/errors';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import {
	type JsonRequest,
	withJsonHandler,
} from '@modules/routing/withJsonHandler';
import {
	type SubscriptionAndAccount,
	withSubscription,
} from '@modules/routing/withMMAIdentityCheck';
import type { CancellationServices } from '..';
import {
	type CancellationResponse,
	cancellationResponses,
	identityHeadersSchema,
	subscriptionPathSchema,
} from './cancellationContract';

export function previewHandler(services: CancellationServices) {
	return (
		_request: JsonRequest<typeof route>,
		{ subscription }: SubscriptionAndAccount,
	): Promise<CancellationResponse> => {
		if (subscription.status === 'Cancelled') {
			throw new ValidationError('Subscription is already cancelled');
		}
		const guardianSubscription =
			services.subscriptionParser.toGuardianSubscription(subscription);
		const currentSubscription =
			SubscriptionFilter.activeCurrentSubscriptionFilter(
				services.now(),
			).filterSubscription(guardianSubscription);
		const { ratePlan } =
			getSinglePlanFlattenedSubscriptionOrThrow(currentSubscription);
		if (ratePlan.productKey !== 'Contribution') {
			throw new ValidationError(
				'Cancellation preview is currently only supported for recurring contributions',
			);
		}
		return Promise.resolve({ type: 'immediate', willRefund: false });
	};
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

export function createPreviewEndpoint(services: CancellationServices) {
	return defineOpenAPIRoute({
		route,
		handler: withJsonHandler(
			withSubscription(
				services.zuoraClient,
				previewHandler(services),
				({ params }) => params.subscriptionNumber,
				'current-segment',
			),
		),
	});
}
