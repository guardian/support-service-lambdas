import { z } from 'zod';

export const listenDisputeCreatedInputSchema = z.object({
	subscriptionNumber: z.string(),
});

export type ListenDisputeCreatedRequestBody = z.infer<
	typeof listenDisputeCreatedInputSchema
>;

export const listenDisputeClosedInputSchema = z.object({
	subscriptionNumber: z.string(),
});

export type ListenDisputeClosedRequestBody = z.infer<
	typeof listenDisputeClosedInputSchema
>;
