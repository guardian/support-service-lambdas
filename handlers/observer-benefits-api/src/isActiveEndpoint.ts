import { logger } from '@modules/routing/logger';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { RequestBody } from './schemas';

export function isActiveEndpoint(
	body: RequestBody,
): Promise<APIGatewayProxyResult> {
	logger.log('Checking if subscription is active', body.subscriptionId);
	return Promise.resolve({
		statusCode: 200,
		body: JSON.stringify({
			isActive: true,
			renews: '2024-12-31',
		}),
	});
}
