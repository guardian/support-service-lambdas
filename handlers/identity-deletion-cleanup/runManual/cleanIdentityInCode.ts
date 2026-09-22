import type { SQSEvent } from 'aws-lambda';
import { getEnv, runWithConfig } from '@modules/routing/lambdaHandler';
import { handler } from '../src';

const identityId = getEnv('IDENTITY_ID');

if (!/^[0-9]+$/.test(identityId)) {
	throw new Error('IDENTITY_ID must contain only digits');
}

const event: SQSEvent = {
	Records: [
		{
			messageId: 'manual-identity-deletion-cleanup',
			receiptHandle: 'manual',
			body: JSON.stringify({
				Type: 'Notification',
				Message: JSON.stringify({ userId: identityId, eventType: 'DELETE' }),
			}),
			attributes: {
				ApproximateReceiveCount: '1',
				SentTimestamp: '0',
				SenderId: 'manual',
				ApproximateFirstReceiveTimestamp: '0',
			},
			messageAttributes: {},
			md5OfBody: 'manual',
			eventSource: 'aws:sqs',
			eventSourceARN: 'arn:aws:sqs:eu-west-1:865473395570:manual',
			awsRegion: 'eu-west-1',
		},
	],
};

runWithConfig(handler, event, 'identity-deletion-cleanup');
