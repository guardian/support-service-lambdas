import type { SNSEventRecord, SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import { buildWebhookMappings, getTeam } from './alarmMappings';
import { getAppNameTag } from './cloudwatch';

const cloudWatchAlarm = z.object({
	Message: z.object({
		AlarmArn: z.string(),
		AlarmName: z.string(),
		NewStateReason: z.string(),
		AlarmDescription: z.string().optional(),
	}),
});

type CloudWatchAlarm = z.infer<typeof cloudWatchAlarm>;

const snsMessageAttribute = z.object({
	Type: z.string(),
	Value: z.string(),
});

const snsPublish = z.object({
	Message: z.string(),
	MessageAttributes: z.object({
		app: snsMessageAttribute.optional(),
		stage: snsMessageAttribute.optional(),
	}),
});

type SNSPublish = z.infer<typeof snsPublish>;

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
