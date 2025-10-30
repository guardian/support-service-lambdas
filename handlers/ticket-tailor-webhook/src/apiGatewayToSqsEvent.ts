import { z } from 'zod';

export const apiGatewayToSqsEventSchema = z.object({
	pathParameters: z.record(z.string()),
	headers: z.record(z.string()),
	queryStringParameters: z.record(z.string()),
	body: z.string(),
	httpMethod: z.string(),
	path: z.string(),
});
export type ApiGatewayToSqsEvent = z.infer<typeof apiGatewayToSqsEventSchema>;
