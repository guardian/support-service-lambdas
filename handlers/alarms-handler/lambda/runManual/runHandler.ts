import { handlerWithStage } from '../src';
import type { SQSEvent } from 'aws-lambda';
import { buildCloudwatch } from '../src/cloudwatch';
import { loadConfig } from '@modules/aws/appConfig';
import { ConfigSchema } from '../src/configSchema';

// to run this, get credentials for membership
// the output will go to chat channel P&E/SR Alarms CODE
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
					AlarmDescription: undefined,
					AWSAccountId: '1111membership',
					StateChangeTime: '2025-06-06T11:20:00.00+0000',
				}),
			}),
		},
	],
} as SQSEvent;

loadConfig('CODE', 'support', 'alarms-handler', ConfigSchema)
	.then((config) => {
		return handlerWithStage(
			handlerTestEvent,
			config.webhookUrls,
			buildCloudwatch(config.accounts).getTags,
		);
	})
	.then(console.log);
