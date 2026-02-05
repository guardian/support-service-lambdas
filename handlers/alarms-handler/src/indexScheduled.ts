import type { MetricAlarm } from '@aws-sdk/client-cloudwatch';
import { flatten, groupMap } from '@modules/arrayFunctions';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { LambdaHandler } from '@modules/routing/lambdaHandler';
import { logger } from '@modules/routing/logger';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { AppToTeams } from './alarmMappings';
import { prodAppToTeams } from './alarmMappings';
import { buildStuckInAlarmMessage } from './buildStuckInAlarmMessage';
import { buildCloudwatch } from './cloudwatch';
import type { AlarmWithTags } from './cloudwatch/getAllAlarmsInAlarm';
import type { WebhookUrls } from './configSchema';
import { ConfigSchema } from './configSchema';

// called by AWS
export const handler = LambdaHandler(ConfigSchema, handlerWithStage);

export async function handlerWithStage(
	ev: unknown,
	{ now, stage, config }: HandlerEnv<ConfigSchema>,
) {
	try {
		const alarms = await buildCloudwatch(config.accounts).getAllAlarmsInAlarm();

		const chatMessages = await getChatMessages(
			now(),
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
					body: JSON.stringify(chatMessage.body),
				});
			}),
		);
	} catch (error) {
		console.error(error);
		throw error;
	}
}

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
): Promise<Array<{ webhookUrl: string; body: object }>> {
	const relevantAlarms = allAlarmData
		.filter(activeOverOneDay(now))
		.filter(sentToAlarmsHandler(stage))
		.filter(actionsEnabled);

	const allWebhookAndBulletPoint: Array<{
		webhookUrl: string;
		alarm: { alarm: MetricAlarm; diagnosticLinks: string | undefined };
	}> = await Promise.all(
		relevantAlarms.flatMap(async (alarmData) => {
			const tags = await alarmData.tags.get();
			const teams = alarmMappings(tags.App);

			const webhookUrls = teams.map((team) => configuredWebhookUrls[team]);
			return webhookUrls.map((webhookUrl) => ({
				webhookUrl,
				alarm: {
					alarm: alarmData.alarm,
					diagnosticLinks: tags.DiagnosticLinks,
				},
			}));
		}),
	).then(flatten);

	logger.log('allWebhookAndBulletPoint', allWebhookAndBulletPoint);

	const webhookToAllMetricAlarms = Object.entries(
		groupMap(
			allWebhookAndBulletPoint,
			(urlAndText) => urlAndText.webhookUrl,
			(urlAndText) => urlAndText.alarm,
		),
	);
	logger.log('webhookToAllTextLines', webhookToAllMetricAlarms);
	return webhookToAllMetricAlarms.map(([webhookUrl, metricAlarms]) => ({
		webhookUrl,
		body: buildStuckInAlarmMessage(metricAlarms),
	}));
}
