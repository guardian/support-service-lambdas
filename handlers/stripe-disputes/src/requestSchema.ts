import { z } from 'zod';

// Stripe webhook event schema based on charge.dispute.created payload
const stripeDisputeDataSchema = z.object({
	object: z.object({
		id: z.string(), // Dispute ID
		charge: z.string(), // Charge ID
		amount: z.number(), // Amount in cents
		currency: z.string(), // Currency code
		reason: z.string(), // Dispute reason
		status: z.string(), // Dispute status
		created: z.number(), // Unix timestamp
		is_charge_refundable: z.boolean(),
		payment_intent: z.string(),
		evidence_details: z.object({
			due_by: z.number(), // Unix timestamp
			has_evidence: z.boolean(),
		}),
		payment_method_details: z.object({
			card: z.object({
				network_reason_code: z.string(),
			}),
		}),
	}),
});

export const listenDisputeCreatedInputSchema = z.object({
	id: z.string(), // Event ID
	type: z.literal('charge.dispute.created'),
	data: stripeDisputeDataSchema,
});

export type ListenDisputeCreatedRequestBody = z.infer<
	typeof listenDisputeCreatedInputSchema
>;

export const listenDisputeClosedInputSchema = z.object({
	id: z.string(), // Event ID
	type: z.literal('charge.dispute.closed'),
	data: stripeDisputeDataSchema,
});

export type ListenDisputeClosedRequestBody = z.infer<
	typeof listenDisputeClosedInputSchema
>;
