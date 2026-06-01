import type { SQSEvent } from 'aws-lambda';
import { runWithConfig } from '../../../modules/routing/src/lambdaHandler';
import { handler } from '../src';

// to run this, get credentials for membership
// the output will go to chat channel P&E/SR/SRE
export const handlerTestEvent: SQSEvent = {
	Records: [
		{
			messageId: 'testMessageId',
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

runWithConfig(handler, handlerTestEvent, 'alarms-handler');
