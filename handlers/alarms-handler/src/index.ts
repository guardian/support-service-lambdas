import type { SNSEventRecord, SQSEvent, SQSRecord } from 'aws-lambda';
import { z } from 'zod';
import { AlarmMappings } from './alarmMappings';
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
		const alarmMappings = new AlarmMappings();
		for (const record of event.Records) {
			const maybeChatMessages = await getChatMessages(record, alarmMappings);

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

	const snsEvent = JSON.parse(record.body) as SNSEventRecord['Sns'];

	console.log('snsEvent', snsEvent);

	const parsedMessage = attemptToParseMessageString(snsEvent.Message);

	console.log('parsedMessage', parsedMessage);

	const message = parsedMessage
		? await getCloudWatchAlarmMessage(parsedMessage, alarmMappings)
		: getSnsPublishMessage({
				message: snsEvent.Message,
				messageAttributes: snsEvent.MessageAttributes,
			});

	if (message) {
		const teams = alarmMappings.getTeams(message.app);
		console.log('sending message to teams', teams);
		const webhookUrls = teams.map(alarmMappings.getTeamWebhookUrl);
		return { webhookUrls, text: message.text };
	} else return undefined;
}

const attemptToParseMessageString = (
	messageString: string,
): CloudWatchAlarmMessage | null => {
	try {
		return cloudWatchAlarmMessageSchema.parse(JSON.parse(messageString));
	} catch (error) {
		return null;
	}
};

async function getCloudWatchAlarmMessage(
	{
		AlarmArn,
		AlarmName,
		NewStateReason,
		NewStateValue,
		AlarmDescription,
		AWSAccountId,
		StateChangeTime,
		Trigger,
	}: CloudWatchAlarmMessage,
	alarmMappings: AlarmMappings,
) {
	const tags = await getTags(AlarmArn, AWSAccountId);
	console.log('tags', tags);
	const { App, Stage } = tags;

	const logGroupNames =
		App && Stage ? alarmMappings.getLogGroups(App, Stage) : [];

	const links = logGroupNames.map((logGroupName) =>
		getCloudwatchLogsLink(logGroupName, Trigger, StateChangeTime),
	);

	const text = getText(
		NewStateValue,
		AlarmName,
		AlarmDescription,
		NewStateReason,
		links,
	);

	console.log(`CloudWatch alarm from ${App}, content ${text}`);

	return text ? { app: App, text } : undefined;
}

function getCloudwatchLogsLink(
	logGroupName: string,
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

	const cloudwatchLogsBaseUrl =
		'https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/';
	const logLink =
		cloudwatchLogsBaseUrl +
		logGroupName.replaceAll('/', '$252F') +
		'/log-events$3Fstart$3D' +
		alarmStartTimeMillis +
		'$26filterPattern$3D$26end$3D' +
		alarmEndTimeMillis;

	return logLink;
}

function getText(
	NewStateValue: string,
	AlarmName: string,
	AlarmDescription: string | null | undefined,
	NewStateReason: string,
	links: string[],
) {
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
	return text;
}

const getSnsPublishMessage = ({
	message,
	messageAttributes,
}: {
	message: string;
	messageAttributes: SNSEventRecord['Sns']['MessageAttributes'];
}) => {
	const stage = messageAttributes.stage?.Value;

	if (stage && stage !== 'PROD') return;

	const app = messageAttributes.app?.Value;

	const text = message;

	console.log(`SNS publish message from ${app}, content ${text}`);

	return { app, text };
};
