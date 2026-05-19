---
# This template creates the main index.ts file of the new lambda

to: handlers/<%=lambdaName%>/src/index.ts
sh: git add handlers/<%=lambdaName%>/src/index.ts
---
import { logger } from '@modules/logger/logger';
import { ok } from '@modules/routing/apiGatewayResponses';
import { Router } from '@modules/routing/router';
<% if (jsonApi === 'Y'){ %>import { withBodyParser, withPathParser } from '@modules/routing/withParsers';
<% } %>import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
<% if (jsonApi === 'Y'){ %>import { z } from 'zod';<% } %>

<% if (jsonApi === 'Y'){ %>
const apiResponseSchema = z.object({ hello: z.literal('world') });
const apiRequestSchema = z.object({});
type ApiRequest = z.infer<typeof apiRequestSchema>;
const apiPathSchema = z.object({
	resource: z.enum(['suitcase', 'cabinet', 'box']),
});
type ApiPath = z.infer<typeof apiPathSchema>;

<% } %>
export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/',
		handler: handleRequest,
	},<% if (jsonApi === 'Y'){ %>
	{
		httpMethod: 'POST',
		path: '/api/{resource}/example',
		handler: withPathParser(
			apiPathSchema,
			withBodyParser(apiRequestSchema, handleApiRequest),
		),
	},
<% } %>
]);

async function handleRequest(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	logger.log(`Input is`, event);
	return await Promise.resolve(ok({ hello: 'world' }));
}
<% if (jsonApi === 'Y'){ %>

/**
 * example endpoint for dealing with JSON input/output safely
 * @param event
 * @param path
 * @param body
 */
async function handleApiRequest(
	event: APIGatewayProxyEvent,
	path: ApiPath,
	body: ApiRequest,
): Promise<APIGatewayProxyResult> {
	logger.log(`parsed path`, path);
	logger.log(`parsed JSON body`, body);
	return await Promise.resolve(ok({ hello: 'world' }, apiResponseSchema));
}
<% } %>