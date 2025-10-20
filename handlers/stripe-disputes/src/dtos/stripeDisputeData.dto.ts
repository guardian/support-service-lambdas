import { z } from 'zod';

export const stripeDisputeDataSchema = z.object({
	object: z.object({
		id: z.string(),
		charge: z.string(),
		amount: z.number(),
		currency: z.string(),
		reason: z.string(),
		status: z.string(),
		created: z.number(),
		is_charge_refundable: z.boolean(),
		payment_intent: z.string(),
		evidence_details: z.object({
			due_by: z.number(),
			has_evidence: z.boolean(),
		}),
		payment_method_details: z
			.object({
				card: z.object({
					network_reason_code: z.string(),
				}),
			})
			.optional(),
	}),
});
