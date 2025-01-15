import type { SNSEventRecord, SQSEvent, SQSRecord } from 'aws-lambda';
import { z } from 'zod';
import type { AlarmMappings } from './alarmMappings';
import { ProdAlarmMappings } from './alarmMappings';
import { getAppNameTag } from './cloudwatch';

const cloudWatchAlarmMessageSchema = z.object({
	AlarmArn: z.string(),
	AlarmName: z.string(),
	AlarmDescription: z.string().nullish(),
	NewStateReason: z.string(),
	NewStateValue: z.string(),
	AWSAccountId: z.string(),
});

type CloudWatchAlarmMessage = z.infer<typeof cloudWatchAlarmMessageSchema>;

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			const maybeChatMessages = await getChatMessages(
				record,
				ProdAlarmMappings,
			);

			if (maybeChatMessages) {
				await Promise.all(
					maybeChatMessages.webhookUrls.map((webhookUrl) => {
						return fetch(webhookUrl, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ text: maybeChatMessages.text }),
						});
					}),
				);
			}
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export async function getChatMessages(
	record: SQSRecord,
	alarmMappings: AlarmMappings,
) {
	console.log('sqsRecord', record);

	const { Message, MessageAttributes } = JSON.parse(
		record.body,
	) as SNSEventRecord['Sns'];

	console.log('snsEvent', Message, MessageAttributes);

	const parsedMessage = attemptToParseMessageString({
		messageString: Message,
	});

	console.log('parsedMessage', parsedMessage);

	let message;
	if (parsedMessage) {
		message = await handleCloudWatchAlarmMessage({ message: parsedMessage });
	} else {
		message = handleSnsPublishMessage({
			message: Message,
			messageAttributes: MessageAttributes,
		});
	}

	if (message) {
		const teams = alarmMappings.getTeams(message.app);
		console.log('sending message to teams', teams);
		const webhookUrls = teams.map(alarmMappings.getTeamWebhookUrl);
		return { webhookUrls, text: message.text };
	} else {
		return undefined;
	}
}

const attemptToParseMessageString = ({
	messageString,
}: {
	messageString: string;
}): CloudWatchAlarmMessage | null => {
	try {
		return cloudWatchAlarmMessageSchema.parse(JSON.parse(messageString));
	} catch (error) {
		console.error(error);
		return null;
	}
};

const handleCloudWatchAlarmMessage = async ({
	message,
}: {
	message: CloudWatchAlarmMessage;
}) => {
	const {
		AlarmArn,
		AlarmName,
		NewStateReason,
		NewStateValue,
		AlarmDescription,
		AWSAccountId,
	} = message;

	const app = await getAppNameTag(AlarmArn, AWSAccountId);

	const title =
		NewStateValue === 'OK'
			? `✅ *ALARM OK:* ${AlarmName} has recovered!`
			: `🚨 *ALARM:* ${AlarmName} has triggered!`;
	const text = `${title}\n\n*Description:* ${
		AlarmDescription ?? ''
	}\n\n*Reason:* ${NewStateReason}`;

	console.log(`CloudWatch alarm from ${app}`);

	return { app, text };
};

const handleSnsPublishMessage = ({
	message,
	messageAttributes,
}: {
	message: string;
	messageAttributes: SNSEventRecord['Sns']['MessageAttributes'];
}) => {
	const stage = messageAttributes.stage?.Value;

	if (stage && stage !== 'PROD') {
		return;
	}

	const app = messageAttributes.app?.Value;

	const text = message;

	console.log(`SNS publish message from ${app}`);

	return { app, text };
};
