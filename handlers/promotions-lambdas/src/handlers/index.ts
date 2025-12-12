import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/',
		handler: handleRequest,
	},
]);

async function handleRequest(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	console.log(`Input is ${JSON.stringify(event)}`);
	return await Promise.resolve({
		body: 'Hello World',
		statusCode: 200,
	});
}
