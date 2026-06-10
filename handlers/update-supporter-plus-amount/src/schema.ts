import { z } from '@hono/zod-openapi';

export const requestBodySchema = z.object({
	newPaymentAmount: z.number(),
});

export type RequestBody = z.infer<typeof requestBodySchema>;
