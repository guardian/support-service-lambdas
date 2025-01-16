import type { SNSEventRecord, SQSEvent, SQSRecord } from 'aws-lambda';
import { z } from 'zod';
import type { AlarmMappings } from './alarmMappings';
import { ProdAlarmMappings } from './alarmMappings';
import { getTags } from './cloudwatch';

const cloudWatchAlarmMessageSchema = z.object({
	AlarmArn: z.string(),
	AlarmName: z.string(),
	AlarmDescription: z.string().nullish(),
	NewStateReason: z.string(),
	NewStateValue: z.string(),
	AWSAccountId: z.string(),
	StateChangeTime: z.coerce.date(),
	Trigger: z
		.object({
			Period: z.number(),
			EvaluationPeriods: z.number(),
		})
		.optional(),
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
		message = await handleCloudWatchAlarmMessage(parsedMessage);
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
	AlarmArn,
	AlarmName,
	NewStateReason,
	NewStateValue,
	AlarmDescription,
	AWSAccountId,
	StateChangeTime,
	Trigger,
}: CloudWatchAlarmMessage) => {
	const { App, DiagnosticUrls } = await getTags(AlarmArn, AWSAccountId);

	const diagnosticUrlTemplates = DiagnosticUrls
		? DiagnosticUrls.split(',')
		: [];

	const links = diagnosticUrlTemplates.map((diagnosticUrlTemplate) =>
		addInsertsToTemplate(diagnosticUrlTemplate, Trigger, StateChangeTime),
	);

	const title =
		NewStateValue === 'OK'
			? `✅ *ALARM OK:* ${AlarmName} has recovered!`
			: `🚨 *ALARM:* ${AlarmName} has triggered!`;
	const text = [
		title,
		`*Description:* ${AlarmDescription ?? ''}`,
		`*Reason:* ${NewStateReason}`,
	]
		.concat(links.map((link) => `*LogLink*: ${link}`))
		.join('\n\n');

	console.log(`CloudWatch alarm from ${App}`, text);

	return { app: App, text };
};

function addInsertsToTemplate(
	diagnosticUrlTemplate: string,
	Trigger:
		| {
				Period: number;
				EvaluationPeriods: number;
		  }
		| undefined,
	StateChangeTime: Date,
) {
	const assumedTimeForCompositeAlarms = 300;
	const alarmCoveredTimeSeconds = Trigger
		? Trigger.EvaluationPeriods * Trigger.Period
		: assumedTimeForCompositeAlarms;
	const alarmEndTimeMillis = StateChangeTime.getTime();
	const alarmStartTimeMillis =
		alarmEndTimeMillis - 1000 * alarmCoveredTimeSeconds;

	const url = diagnosticUrlTemplate
		.replaceAll('$startMillis', `${alarmStartTimeMillis}`)
		.replaceAll('$endMillis', `${alarmEndTimeMillis}`);

	return url;
}

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
