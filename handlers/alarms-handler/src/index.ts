import type { SNSEventRecord, SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import { getTeam, getTeamWebhookUrl } from './alarmMappings';
import { getAppNameTag } from './cloudwatch';

const cloudWatchAlarmMessageSchema = z.object({
	AlarmArn: z.string(),
	AlarmName: z.string(),
	AlarmDescription: z.string().nullish(),
	NewStateReason: z.string(),
	AWSAccountId: z.string(),
});

type CloudWatchAlarmMessage = z.infer<typeof cloudWatchAlarmMessageSchema>;

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			console.log(record);

			const { Message, MessageAttributes } = JSON.parse(
				record.body,
			) as SNSEventRecord['Sns'];

			const parsedMessage = attemptToParseMessageString({
				messageString: Message,
			});

			if (parsedMessage) {
				await handleCloudWatchAlarmMessage({ message: parsedMessage });
			} else {
				await handleSnsPublishMessage({
					message: Message,
					messageAttributes: MessageAttributes,
				});
			}
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const attemptToParseMessageString = ({
	messageString,
}: {
	messageString: string;
}): CloudWatchAlarmMessage | null => {
	try {
		return cloudWatchAlarmMessageSchema.parse(JSON.parse(messageString));
	} catch (error) {
		return null;
	}
};

const handleCloudWatchAlarmMessage = async ({
	message,
}: {
	message: CloudWatchAlarmMessage;
}) => {
	const { AlarmArn, AlarmName, NewStateReason, AlarmDescription, AWSAccountId } = message;

	const app = await getAppNameTag(AlarmArn, AWSAccountId);
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

const handleSnsPublishMessage = async ({
	message,
	messageAttributes,
}: {
	message: string;
	messageAttributes: SNSEventRecord['Sns']['MessageAttributes'];
}) => {
	const stage = messageAttributes.stage?.Value;

	if (stage && stage !== 'PROD') return;

	const app = messageAttributes.app?.Value;
	const team = getTeam(app);
	const webhookUrl = getTeamWebhookUrl(team);

	const text = message;

	console.log(`SNS publish message from ${app} owned by ${team}`);

	await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text }),
	});
};
