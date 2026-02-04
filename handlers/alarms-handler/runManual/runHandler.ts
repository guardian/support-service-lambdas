import { loadConfig } from '@modules/aws/appConfig';
import type { SQSRecord } from 'aws-lambda';
import { handleSQSRecord } from '../src';
import { buildCloudwatch } from '../src/cloudwatch';
import { ConfigSchema } from '../src/configSchema';

// to run this, get credentials for membership
// the output will go to chat channel P&E/SR/SRE
export const handlerTestRecord: SQSRecord = {
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
} as SQSRecord;

loadConfig('CODE', 'support', 'alarms-handler', ConfigSchema)
	.then((config) => {
		return handleSQSRecord(
			handlerTestRecord,
			config.webhookUrls,
			buildCloudwatch(config.accounts).getTags,
		);
	})
	.then(console.log)
	.catch(console.error);
