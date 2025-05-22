import type { MetricAlarm } from '@aws-sdk/client-cloudwatch';
import { flatten, groupMap } from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { AlarmMappings } from './alarmMappings';
import { prodAlarmMappings } from './alarmMappings';
import type { AlarmWithTags } from './cloudwatch';
import { cloudwatchClients, getAllAlarmsInAlarm } from './cloudwatch';
import { getConfig } from './config';
import { buildDiagnosticLinks } from './index';

// called by AWS
export const handler = async (): Promise<void> => {
	try {
		const now = dayjs();
		const alarms = await getAllAlarmsInAlarm(await cloudwatchClients.get());

		const chatMessages = await getChatMessages(
			now,
			getConfig('STAGE'),
			alarms,
			prodAlarmMappings,
		);

		await Promise.all(
			chatMessages.map((chatMessage) => {
				return fetch(chatMessage.webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: chatMessage.text }),
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

export async function getChatMessages(
	now: Dayjs,
	stage: string,
	allAlarmData: AlarmWithTags[],
	alarmMappings: AlarmMappings,
): Promise<Array<{ webhookUrl: string; text: string }>> {
	const relevantAlarms = allAlarmData
		.filter(activeOverOneDay(now))
		.filter(sentToAlarmsHandler(stage));

	const allWebhookAndBulletPoint: Array<{ webhookUrl: string; text: string }> =
		await Promise.all(
			relevantAlarms.flatMap(async (alarmData) => {
				const text = await buildCloudWatchAlarmMessage(alarmData);

				const teams = alarmMappings.getTeams((await alarmData.tags.get()).App);

				const webhookUrls = teams.map(alarmMappings.getTeamWebhookUrl);
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
	const trigger = {
		Period: getIfDefined(alarm.Period, 'no period in alarm'),
		EvaluationPeriods: getIfDefined(
			alarm.EvaluationPeriods,
			'no evaluation period in alarm',
		),
	};
	const stateChangeTime = getIfDefined(
		alarm.StateTransitionedTimestamp,
		'no transition timestamp',
	);
	return buildDiagnosticLinks(DiagnosticLinks, trigger, stateChangeTime);
}

const buildCloudWatchAlarmMessage = async (alarmData: AlarmWithTags) => {
	const { App, DiagnosticLinks } = await alarmData.tags.get();
	const links = getDiagnosticLinks(DiagnosticLinks, alarmData.alarm);

	const alarmUrl =
		'https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/' +
		alarmData.alarm.AlarmName;
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
