import { Logger } from '@modules/routing/logger';
import type { SQSEvent } from 'aws-lambda';

const logger = new Logger();

export const handler = async (event: SQSEvent): Promise<void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);
	logger.log('SQS events processed successfully');
};
