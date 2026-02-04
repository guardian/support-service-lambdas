import { Logger } from '@modules/routing/logger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const logger = new Logger();

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult | void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);
};
