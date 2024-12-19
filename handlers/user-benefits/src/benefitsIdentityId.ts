import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const benefitsIdentityIdHandler = (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	return Promise.resolve({
		body: JSON.stringify({ test: true }),
		// https://www.fastly.com/documentation/guides/concepts/edge-state/cache/cache-freshness/#preventing-content-from-being-cached
		headers: {
			'Cache-Control': 'private, no-store',
		},
		statusCode: 200,
	});
};
