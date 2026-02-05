import { invokeCODELambda } from '@modules/routing/lambdaHandler';
import type { SQSEvent } from 'aws-lambda';

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

// run this after deploying to CODE to invoke the deployed lambda
invokeCODELambda('alarms-handler-CODE', handlerTestEvent);
