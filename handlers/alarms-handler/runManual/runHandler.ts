import { handlerWithStage } from '../src/index';
import { loadConfig } from '../src/config';
import type { SQSEvent } from 'aws-lambda';
import { Cloudwatch } from '../src/cloudwatch';

// to run this, get credentials for membership
// the output will go to chat channel P&E/SR Alarms CODE
const testEvent: SQSEvent = {
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

loadConfig('CODE', 'support', 'alarms-handler')
	.then((config) => {
		return handlerWithStage(
			testEvent,
			config.webhookUrls,
			new Cloudwatch(config.accounts).getTags,
		);
	})
	.then(console.log);
