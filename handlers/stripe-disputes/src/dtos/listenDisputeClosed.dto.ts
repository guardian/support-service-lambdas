import { z } from 'zod';
import { stripeDisputeDataSchema } from './stripeDisputeData.dto';

export const listenDisputeClosedInputSchema = z.object({
	id: z.string(), // Event ID
	type: z.literal('charge.dispute.closed'),
	data: stripeDisputeDataSchema,
});

export type ListenDisputeClosedRequestBody = z.infer<
	typeof listenDisputeClosedInputSchema
>;
