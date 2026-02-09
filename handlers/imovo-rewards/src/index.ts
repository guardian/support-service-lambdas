import type { APIGatewayProxyResult } from 'aws-lambda';

export const handler = (): APIGatewayProxyResult => {
	console.log('Hello World invoked!');

	return {
		statusCode: 200,
		body: JSON.stringify({
			message: 'Hello World from imovo-rewards!',
		}),
	};
};
