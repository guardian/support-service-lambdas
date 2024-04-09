import type { APIGatewayProxyResult, Handler } from 'aws-lambda';

export const handler: Handler = async (
	event: unknown,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	return await Promise.resolve({
		body: 'Hello World',
		statusCode: 200,
	});
};
