import { z } from 'zod';

export const BatonSarEventRequestBaseSchema = z.object({
	requestType: z.literal('SAR'),
});
export const BatonSarEventResponseBaseSchema = z.object({
	requestType: z.literal('SAR'),
	status: z.enum(['pending', 'completed', 'failed']),
	message: z.string(),
});
