import { z } from 'zod';

export const BatonRerEventRequestBaseSchema = z.object({
	requestType: z.literal('RER'),
});
export const BatonRerEventResponseBaseSchema = z.object({
	requestType: z.literal('RER'),
	status: z.enum(['pending', 'completed', 'failed']),
	message: z.string(),
});
