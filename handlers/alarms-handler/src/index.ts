import type { SNSEventRecord, SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import { getTeam, getTeamWebhookUrl } from './alarmMappings';
import { getAppNameTag } from './cloudwatch';

const cloudWatchAlarmEventRecord = z.object({
	Message: z.object({
		AlarmArn: z.string(),
		AlarmName: z.string(),
		NewStateReason: z.string(),
		AlarmDescription: z.string().optional(),
	}),
});

type CloudWatchAlarmEventRecord = z.infer<typeof cloudWatchAlarmEventRecord>;

const snsMessageAttribute = z.object({
	Type: z.string(),
	Value: z.string(),
});

const snsPublishEventRecord = z.object({
	Message: z.string(),
	MessageAttributes: z.object({
		app: snsMessageAttribute.optional(),
		stage: snsMessageAttribute.optional(),
	}),
});

type SNSPublishEventRecord = z.infer<typeof snsPublishEventRecord>;

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			console.log(record);
			const recordBody = JSON.parse(record.body) as SNSEventRecord['Sns'];

			try {
				await handleCloudWatchAlarmEventRecord({ recordBody });
			} catch (error) {
				if (error instanceof SyntaxError) {
					await handleSnsPublishEventRecord({ recordBody });
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

const handleCloudWatchAlarmEventRecord = async ({
	recordBody,
}: {
	recordBody: SNSEventRecord['Sns'];
}) => {
	const { AlarmArn, AlarmName, NewStateReason, AlarmDescription } = JSON.parse(
		recordBody.Message,
	) as CloudWatchAlarmEventRecord['Message'];

	const app = await getAppNameTag(AlarmArn);
	const team = getTeam(app);
	const webhookUrl = getTeamWebhookUrl(team);

	const text = `*ALARM:* ${AlarmName} has triggered!\n\n*Description:* ${
		AlarmDescription ?? ''
	}\n\n*Reason:* ${NewStateReason}`;

	console.log(`CloudWatch alarm from ${app} owned by ${team}`);

	await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text }),
	});
};

const handleSnsPublishEventRecord = async ({
	recordBody,
}: {
	recordBody: SNSEventRecord['Sns'];
}) => {
	const { Message, MessageAttributes } = recordBody;

	const messageAttributes =
		MessageAttributes as SNSPublishEventRecord['MessageAttributes'];

	const stage = messageAttributes.stage?.Value;

	if (stage !== 'PROD') return;

	const app = messageAttributes.app?.Value;
	const team = getTeam(app);
	const webhookUrl = getTeamWebhookUrl(team);

	const text = Message;

	console.log(`SNS publish message from ${app} owned by ${team}`);

	await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text }),
	});
};
