import { z } from 'zod';
import {
	accountNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';

export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)');

// Body of the Zuora callout template, populated from Zuora merge fields
export const billingDateCalloutSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountNumber: accountNumberSchema,
	chargeNumber: z.string().min(1),
	chargedThroughDate: isoDateSchema,
});

// The callout request as API Gateway puts it on the queue (see cdk/lib/cdk/ApiGatewayToSqs.ts)
const queuedRequestSchema = z.object({
	headers: z.record(z.string(), z.string()),
	body: z.string(),
});

export type BillingDateMessage = {
	notificationId?: string;
	subscriptionNumber: string;
	accountNumber: string;
	chargeNumber: string;
	billingDate: string;
};

export function parseBillingDateMessage(sqsBody: string): BillingDateMessage {
	const { headers, body } = queuedRequestSchema.parse(JSON.parse(sqsBody));
	const callout = billingDateCalloutSchema.parse(JSON.parse(body));
	// header names keep the case Zuora sent; this one stays the same across Zuora retries
	const notificationId = Object.entries(headers).find(
		([name]) => name.toLowerCase() === 'zuora-notification-id',
	)?.[1];
	return {
		notificationId,
		subscriptionNumber: callout.subscriptionNumber,
		accountNumber: callout.accountNumber,
		chargeNumber: callout.chargeNumber,
		billingDate: callout.chargedThroughDate,
	};
}
