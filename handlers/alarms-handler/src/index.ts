import { loadLazyConfig, whoAmI } from '@modules/aws/appConfig';
import type { SNSEventRecord, SQSEvent, SQSRecord } from 'aws-lambda';
import { z } from 'zod';
import type { AppToTeams } from './alarmMappings';
import { prodAppToTeams } from './alarmMappings';
import type { Tags } from './cloudwatch';
import { buildCloudwatch } from './cloudwatch';
import type { WebhookUrls } from './configSchema';
import { ConfigSchema } from './configSchema';

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

// only load config on a cold start
const config = whoAmI.then(loadLazyConfig(ConfigSchema));

export const handler = async (event: SQSEvent): Promise<void> => {
	const { appConfig, accountIds } = await config.get();
	const getTags = buildCloudwatch(
		(await appConfig.get()).accounts,
		await accountIds.get(),
	).getTags;
	await handlerWithStage(event, (await appConfig.get()).webhookUrls, getTags);
};

export const handlerWithStage = async (
	event: SQSEvent,
	webhookUrls: WebhookUrls,
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>,
) => {
	try {
		for (const record of event.Records) {
			const maybeChatMessages = await getChatMessages(
				record,
				prodAppToTeams,
				getTags,
				webhookUrls,
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
	appToTeams: AppToTeams,
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>,
	configuredWebhookUrls: WebhookUrls,
): Promise<{ webhookUrls: string[]; text: string } | undefined> {
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
		message = await buildCloudWatchAlarmMessage(parsedMessage, getTags);
	} else {
		message = buildSnsPublishMessage({
			message: Message,
			messageAttributes: MessageAttributes,
		});
	}

	if (message) {
		const teams = appToTeams(message.app);
		console.log(`app ${message.app} is assigned to teams ${teams.join(', ')}`);
		const webhookUrls = teams.map((team) => configuredWebhookUrls[team]);
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

export function buildDiagnosticLinks(
	DiagnosticLinks: string | undefined,
	trigger:
		| {
				Period: number;
				EvaluationPeriods: number;
		  }
		| undefined,
	stateChangeTime: Date,
) {
	const diagnosticUrlTemplates = DiagnosticLinks
		? DiagnosticLinks.split(' ').map((link) => ({
				prefix: link.split(':', 1)[0],
				value: link.replace(/^[^:]+:/, ''),
			}))
		: [];

	return diagnosticUrlTemplates.flatMap((diagnosticUrlTemplate) => {
		if (diagnosticUrlTemplate.prefix === 'lambda') {
			return getCloudwatchLogsLink(
				`/aws/lambda/${diagnosticUrlTemplate.value}`,
				trigger,
				stateChangeTime,
			);
		} else {
			console.log('unknown DiagnosticLinks tag prefix', diagnosticUrlTemplate);
			return [];
		}
	});
}

const buildCloudWatchAlarmMessage = async (
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
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>,
) => {
	const { App, DiagnosticLinks } = await getTags(AlarmArn, AWSAccountId);

	const links = buildDiagnosticLinks(DiagnosticLinks, Trigger, StateChangeTime);

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
	// API gateway metrics within a one minute period sometimes seem to be assigned to the next minute datapoint
	const extraTimeForPropagation = 60;
	const alarmCoveredTimeSeconds = Trigger
		? Trigger.EvaluationPeriods * Trigger.Period
		: assumedTimeForCompositeAlarms;
	// alarms only evaluate once a minute so the actual error might have occurred up to a minute earlier
	const alarmEndTimeMillis = (function () {
		const stateChangeForMinute = new Date(StateChangeTime.getTime());
		return stateChangeForMinute.setSeconds(0, 0);
	})();
	const alarmStartTimeMillis =
		alarmEndTimeMillis -
		1000 * (alarmCoveredTimeSeconds + extraTimeForPropagation);

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

const buildSnsPublishMessage = ({
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

	console.log(`SNS publish message from ${app}`);

	return { app, text: message };
};
