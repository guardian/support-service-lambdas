import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { logger } from '@modules/logger/logger';
import { apiErrorResponses } from '@modules/routing/apiGatewayHandler';
import {
	type JsonRequest,
	withJsonHandler,
} from '@modules/routing/withJsonHandler';
import {
	accountNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';
import type { EmailRemindersServices } from '..';

// Body of the Zuora callout template, populated from Zuora merge fields.
// Zuora localises dates using the communication profile, so the date is not parsed as ISO until its format is confirmed.
export const billingDateCalloutSchema = z
	.object({
		subscriptionNumber: subscriptionNumberSchema,
		accountNumber: accountNumberSchema,
		ratePlanChargeId: z.string().min(1),
		chargedThroughDate: z.string().min(1),
	})
	.openapi('BillingDateCallout');

export type BillingDateCallout = z.infer<typeof billingDateCalloutSchema>;

const calloutHeadersSchema = z.object({
	'zuora-notification-id': z.string().optional().openapi({
		description: 'Stays the same across Zuora retries of one notification',
	}),
});

const acceptedResponseSchema = z
	.strictObject({ status: z.literal('accepted') })
	.openapi('CalloutAccepted');

export function billingDateHandler(
	_services: EmailRemindersServices,
	{ body, headers }: JsonRequest<typeof route>,
): Promise<z.input<typeof acceptedResponseSchema>> {
	logger.mutableAddContext(body.subscriptionNumber);
	logger.log('received billing date callout', {
		notificationId: headers['zuora-notification-id'],
		...body,
	});
	return Promise.resolve({ status: 'accepted' });
}

const route = createRoute({
	method: 'post',
	path: '/zuora-callouts/billing-date',
	operationId: 'billingDateCallout',
	summary: 'Zuora billing date callout',
	description:
		'Called by a Zuora scheduled event a fixed number of days before a charge is next billed.',
	security: [{ apiKey: [] }],
	request: {
		headers: calloutHeadersSchema,
		body: {
			required: true,
			content: { 'application/json': { schema: billingDateCalloutSchema } },
		},
	},
	responses: {
		200: {
			description: 'The callout was accepted.',
			content: { 'application/json': { schema: acceptedResponseSchema } },
		},
		...apiErrorResponses,
	},
});

export const billingDateEndpoint = defineOpenAPIRoute({
	route,
	handler: withJsonHandler(billingDateHandler),
});
