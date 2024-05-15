import type { SNSEventRecord, SNSMessageAttribute, SQSEvent } from 'aws-lambda';
import { buildWebhookMappings, getTeam } from './alarmMappings';
import { getAppNameTag } from './cloudwatch';

type CloudWatchAlarm = {
	Message: {
		AlarmArn: string;
		AlarmName: string;
		NewStateReason: string;
		AlarmDescription?: string;
	};
};

type SNSPublish = {
	Message: string;
	MessageAttributes: { app?: SNSMessageAttribute; stage?: SNSMessageAttribute };
};

export const handler = async (event: SQSEvent): Promise<void> => {
	const webhookMappings = buildWebhookMappings();

	try {
		for (const record of event.Records) {
			console.log(record);
			const recordBody = JSON.parse(record.body) as SNSEventRecord['Sns'];

			try {
				const { AlarmArn, AlarmName, NewStateReason, AlarmDescription } =
					JSON.parse(recordBody.Message) as CloudWatchAlarm['Message'];

				const app = await getAppNameTag(AlarmArn);
				const team = getTeam(app);
				const webhookUrl = webhookMappings[team];

				const text = `*ALARM:* ${AlarmName} has triggered!\n\n*Description:* ${
					AlarmDescription ?? ''
				}\n\n*Reason:* ${NewStateReason}`;

				console.log(`CloudWatch alarm from ${app} owned by ${team}`);

				await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text }),
				});
			} catch (error) {
				if (error instanceof SyntaxError) {
					const { Message, MessageAttributes } = recordBody;

					const messageAttributes =
						MessageAttributes as SNSPublish['MessageAttributes'];

					const stage = messageAttributes.stage?.Value;

					if (stage !== 'PROD') return;

					const app = messageAttributes.app?.Value;
					const team = getTeam(app);
					const webhookUrl = webhookMappings[team];

					const text = Message;

					console.log(`SNS publish message from ${app} owned by ${team}`);

					await fetch(webhookUrl, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ text }),
					});
				} else {
					throw error;
				}
			}
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};
