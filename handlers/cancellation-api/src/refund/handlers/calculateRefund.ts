import { logger } from '@modules/logger/logger';
import { refundWorkflowInputSchema } from '../refundWorkflowInput';

export const handler = (event: unknown): Promise<never> => {
	const input = refundWorkflowInputSchema.parse(event);
	logger.mutableAddContext(input.subscriptionNumber);
	logger.log('calculateRefund invoked', input);
	return Promise.reject(new Error('calculateRefund is not implemented yet'));
};
