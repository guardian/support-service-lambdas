---
# This template creates the main index.ts file of the new lambda

to: handlers/<%=lambdaName%>/src/index.ts
---
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	return await Promise.resolve({
		body: 'Hello World',
		statusCode: 200,
	});
};


