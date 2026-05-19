import { logger } from '@modules/logger/logger';
import { ok } from '@modules/routing/apiGatewayResponses';
import { Router } from '@modules/routing/router';
import { withBodyParser, withPathParser } from '@modules/routing/withParsers';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { z } from 'zod';

const apiResponseSchema = z.object({ hello: z.literal('world') });
const apiRequestSchema = z.object({});
type ApiRequest = z.infer<typeof apiRequestSchema>;
const apiPathSchema = z.object({
	resource: z.enum(['suitcase', 'cabinet', 'box']),
});
type ApiPath = z.infer<typeof apiPathSchema>;

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/',
		handler: handleRequest,
	},
	{
		httpMethod: 'POST',
		path: '/api/{resource}/example',
		handler: withPathParser(
			apiPathSchema,
			withBodyParser(apiRequestSchema, handleApiRequest),
		),
	},
]);

async function handleRequest(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	logger.log(`Input is`, event);
	return await Promise.resolve(ok({ hello: 'world' }));
}

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
