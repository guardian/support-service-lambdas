import { z } from 'zod';

export const cancelledBySchema = z.union([
	z.literal('primary'),
	z.literal('secondary'),
]);

export type CancelledBy = z.infer<typeof cancelledBySchema>;
