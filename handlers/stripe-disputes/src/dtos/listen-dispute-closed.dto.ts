import { z } from 'zod';
import { stripeDisputeDataSchema } from './stripe-dispute-data.dto';

export const listenDisputeClosedInputSchema = z.object({
	id: z.string(), // Event ID
	type: z.literal('charge.dispute.closed'),
	data: stripeDisputeDataSchema,
});

export type ListenDisputeClosedRequestBody = z.infer<
	typeof listenDisputeClosedInputSchema
>;
