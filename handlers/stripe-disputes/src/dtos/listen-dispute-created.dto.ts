import { z } from 'zod';
import { stripeDisputeDataSchema } from './stripe-dispute-data.dto';

export const listenDisputeCreatedInputSchema = z.object({
	id: z.string(), // Event ID
	type: z.literal('charge.dispute.created'),
	data: stripeDisputeDataSchema,
});

export type ListenDisputeCreatedRequestBody = z.infer<
	typeof listenDisputeCreatedInputSchema
>;
