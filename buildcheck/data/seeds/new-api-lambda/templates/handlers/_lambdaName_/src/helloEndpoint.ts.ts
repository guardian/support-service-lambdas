export default (): string =>
	`import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

export const helloRequestSchema = z.object({
	name: z.string(),
});
export type HelloRequest = z.infer<typeof helloRequestSchema>;

const helloResponseSchema = z.object({
	message: z.string(),
});

export function helloRequestEndpoint(
	body: HelloRequest,
): Promise<APIGatewayProxyResult> {
	try {
		return Promise.resolve(
			ok({ message: \`Hello \${body.name}!\` }, helloResponseSchema),
		);
	} catch (e) {
		return Promise.resolve(buildErrorResponse(e));
	}
}
`;
