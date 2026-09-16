import type { Stage } from '@modules/aws/cloudwatch';
import { putMetric } from '@modules/aws/cloudwatch';

const stagesToSendMetrics: Stage[] = ['CODE', 'PROD'];

const isTest = (): boolean => !!process.env.JEST_WORKER_ID;

export const putEmailFailureMetric = (stage: Stage): Promise<void> => {
	if (isTest() || !stagesToSendMetrics.includes(stage)) {
		return Promise.resolve();
	}

	return putMetric('multiple-accounts-email-trigger-failure', stage);
};
