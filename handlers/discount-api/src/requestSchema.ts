import { z } from 'zod';

export const digitalSubSaveRequestSchema = z.object({
	subscriptionNumber: z.string(),
});

export type DigisubSaveRequest = z.infer<typeof digitalSubSaveRequestSchema>;
