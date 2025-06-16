import type { MetricAlarm } from '@aws-sdk/client-cloudwatch';
import { flatten, groupMap } from '@modules/arrayFunctions';
import { loadConfig } from '@modules/aws/appConfig';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { AppToTeams } from './alarmMappings';
import { prodAppToTeams } from './alarmMappings';
import type { AlarmWithTags } from './cloudwatch';
import { buildCloudwatch } from './cloudwatch';
import type { WebhookUrls } from './configSchema';
import { ConfigSchema, getEnv } from './configSchema';
import { buildDiagnosticLinks } from './index';

// only load config on a cold start
export const lazyConfig = new Lazy(async () => {
	const stage = getEnv('STAGE');
	const stack = getEnv('STACK');
	const app = getEnv('APP');
	return { stage, config: await loadConfig(stage, stack, app, ConfigSchema) };
}, 'load config from SSM');

// called by AWS
export const handler = async (): Promise<void> => {
	const { stage, config } = await lazyConfig.get();
	await handlerWithStage(dayjs(), stage, config);
};

export const handlerWithStage = async (
	now: dayjs.Dayjs,
	stage: string,
	config: ConfigSchema,
) => {
	try {
		const alarms = await buildCloudwatch(config.accounts).getAllAlarmsInAlarm();

		const chatMessages = await getChatMessages(
			now,
			stage,
			alarms,
			prodAppToTeams,
			config.webhookUrls,
		);

		await Promise.all(
			chatMessages.map(async (chatMessage) => {
				console.log('sending one chat message to', chatMessage.webhookUrl);
				return await fetch(chatMessage.webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						text: chatMessage.text,
					}),
				});
			}),
		);
	} catch (error) {
		console.error(error);
		throw error;
	}
};

function activeOverOneDay(now: dayjs.Dayjs) {
	return (alarm: AlarmWithTags) =>
		dayjs(alarm.alarm.StateTransitionedTimestamp).add(1, 'day').isBefore(now);
}

function sentToAlarmsHandler(stage: string) {
	return (alarm: AlarmWithTags) =>
		(alarm.alarm.AlarmActions?.findIndex((alarmAction) =>
			alarmAction.endsWith('alarms-handler-topic-' + stage),
		) ?? -1) >= 0;
}

const actionsEnabled = (alarm: AlarmWithTags): boolean =>
	alarm.alarm.ActionsEnabled ?? true;

export async function getChatMessages(
	now: Dayjs,
	stage: string,
	allAlarmData: AlarmWithTags[],
	alarmMappings: AppToTeams,
	configuredWebhookUrls: WebhookUrls,
): Promise<Array<{ webhookUrl: string; text: string }>> {
	const relevantAlarms = allAlarmData
		.filter(activeOverOneDay(now))
		.filter(sentToAlarmsHandler(stage))
		.filter(actionsEnabled);

	const allWebhookAndBulletPoint: Array<{ webhookUrl: string; text: string }> =
		await Promise.all(
			relevantAlarms.flatMap(async (alarmData) => {
				const text = await buildCloudWatchAlarmMessage(alarmData);

				const teams = alarmMappings((await alarmData.tags.get()).App);

				const webhookUrls = teams.map((team) => configuredWebhookUrls[team]);
				return webhookUrls.map((webhookUrl) => ({ webhookUrl, text }));
			}),
		).then(flatten);

	console.log('allWebhookAndBulletPoint', allWebhookAndBulletPoint);

	const webhookToAllTextLines = Object.entries(
		groupMap(
			allWebhookAndBulletPoint,
			(urlAndText) => urlAndText.webhookUrl,
			(urlAndText) => urlAndText.text,
		),
	);
	console.log('webhookToAllTextLines', webhookToAllTextLines);
	return webhookToAllTextLines.map(([webhookUrl, bulletPointsForUrl]) => ({
		webhookUrl,
		text:
			'These alarms have been going off for more than 24h\n\n' +
			bulletPointsForUrl.join('\n'),
	}));
}

function getDiagnosticLinks(
	DiagnosticLinks: string | undefined,
	alarm: MetricAlarm,
) {
	const { Period, EvaluationPeriods } = alarm;
	const trigger =
		Period && EvaluationPeriods ? { Period, EvaluationPeriods } : undefined;
	const stateChangeTime = getIfDefined(
		alarm.StateTransitionedTimestamp,
		'no transition timestamp',
	);
	return buildDiagnosticLinks(DiagnosticLinks, trigger, stateChangeTime);
}

const buildCloudWatchAlarmMessage = async (alarmData: AlarmWithTags) => {
	const { App, DiagnosticLinks } = await alarmData.tags.get();
	const links = getDiagnosticLinks(DiagnosticLinks, alarmData.alarm);

	const alarmUrl = alarmData.alarm.AlarmName
		? 'https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/' +
			encodeURIComponent(alarmData.alarm.AlarmName).replaceAll('.', '%2E') // dots break gchat url detection
		: undefined;
	const timestampISO =
		alarmData.alarm.StateTransitionedTimestamp?.toISOString() ??
		'unknown timestamp';
	const timestampWithLink = links[0]
		? `<${links[0]}|${timestampISO}>`
		: timestampISO;
	const message = `- <${alarmUrl}|${alarmData.alarm.AlarmName}> - ${timestampWithLink} - ${alarmData.alarm.AlarmDescription ?? ''}`;

	console.log(`CloudWatch alarm from ${App}`, message);

	return message;
};
