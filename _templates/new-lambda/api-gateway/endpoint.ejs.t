---
# This template creates a file to contain the logic for the first example endpoint

to: handlers/<%=lambdaName%>/src/testEndpoint.ts
sh: git add handlers/<%=lambdaName%>/src/testEndpoint.ts
---
import { ok } from '@modules/routing/apiGatewayResponses';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

export const testRequestSchema = z.object({
	name: z.string(),
});
export type TestRequest = z.infer<typeof testRequestSchema>;

export function testRequestEndpoint(
	body: TestRequest,
): Promise<APIGatewayProxyResult> {
	return Promise.resolve(ok(`Hello ${body.name}!`));
}
