---
# This template creates the main index.ts file of the new lambda

to: handlers/<%=lambdaName%>/src/index.ts
sh: git add handlers/<%=lambdaName%>/src/index.ts
---
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



