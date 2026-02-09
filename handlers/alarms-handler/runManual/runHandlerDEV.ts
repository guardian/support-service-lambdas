import { logger } from '@modules/routing/logger';
import type { SQSEvent } from 'aws-lambda';
import { getEnv } from '../../../modules/routing/src/lambdaHandler';
import type { Services } from '../src';
import { handlerWithStage } from '../src';

// to run this, get credentials for membership
// and set TEST_WEBHOOK to your chat link
export const handlerTestEvent: SQSEvent = {
	Records: [
		{
			body: JSON.stringify({
				Message: JSON.stringify({
					AlarmArn:
						'arn:aws:cloudwatch:eu-west-1:865473395570:alarm:support-workers CODE No successful PayPal supporter plus subscriptions recently.',
					AlarmName:
						'support-workers CODE No successful PayPal supporter plus subscriptions recently.',
					NewStateReason: 'too much flour in the mill stone',
					NewStateValue: 'ALARM',
					AlarmDescription:
						'Alarm when the dead letter queue accumulates messages.',
					AWSAccountId: '1111membership',
					StateChangeTime: '2025-06-06T11:20:00.00+0000',
				}),
			}),
		},
	],
} as SQSEvent;

const testWebhook = getEnv('TEST_WEBHOOK');
logger.log('testWebhook', testWebhook);
const services: Services = {
	getTags: () =>
		Promise.resolve({
			App: 'product-switch-api',
			DiagnosticLinks: 'lambda:product-switch-api-CODE',
		}),
	webhookUrls: {
		VALUE: testWebhook,
		GROWTH: testWebhook,
		SRE: testWebhook,
		PORTFOLIO: testWebhook,
		PLATFORM: testWebhook,
		ENGINE: testWebhook,
		PUZZLES: testWebhook,
	},
};

handlerWithStage(handlerTestEvent.Records[0]!, services)
	.then(console.log)
	.catch(console.error);
