import type { AlarmHistoryItem } from '@aws-sdk/client-cloudwatch';
import { groupMap } from '@modules/arrayFunctions';
import type { Lazy } from '@modules/lazy';
import { objectEntries, objectKeys } from '@modules/objectFunctions';
import type { HandlerProps } from '@modules/routing/lambdaHandler';
import { LambdaHandler } from '@modules/routing/lambdaHandler';
import { logger } from '@modules/routing/logger';
import { z } from 'zod';
import type { AppToTeams, Team } from './alarmMappings';
import { prodAppToTeams } from './alarmMappings';
import { buildCloudWatchSummaryMessage } from './buildCloudWatchSummaryMessage';
import { buildCloudwatch } from './cloudwatch';
import type { AlarmHistoryWithTags } from './cloudwatch/getAlarmHistory';
import type { Tags } from './cloudwatch/getTags';
import type { WebhookUrls } from './configSchema';
import { ConfigSchema } from './configSchema';

// only teams that have opted in will get the weekly summary
const weeklySummaryTeams: Team[] = ['VALUE'];

// called by AWS
export const handler = LambdaHandler(ConfigSchema, handlerWithStage);

export async function handlerWithStage({
	now,
	stage,
	config,
}: HandlerProps<ConfigSchema>) {
	try {
		const cloudwatch = buildCloudwatch(config.accounts);
		const alarmHistory: AlarmHistoryWithTags[] =
			await cloudwatch.getAlarmHistory(now);

		const chatMessages = await getChatMessages(
			stage,
			alarmHistory,
			prodAppToTeams,
			config.webhookUrls,
		);

		logger.log('got chat messages', chatMessages);

		const enabledChatMessages = chatMessages.filter(({ team }) =>
			weeklySummaryTeams.includes(team),
		);

		logger.log('got enabled chat messages', enabledChatMessages);

		await Promise.all(
			enabledChatMessages.map(async (chatMessage) => {
				const body = JSON.stringify(chatMessage.payload);
				logger.log('sending one chat message to', chatMessage.webhookUrl, body);
				const response = await fetch(chatMessage.webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body,
				});
				logger.log('http response', response, await response.text());
				return response;
			}),
		);
	} catch (error) {
		console.error(error);
		throw error;
	}
}

// has a nested json inside HistoryData
const AlarmHistoryDataSchema = z.object({
	oldState: z
		.object({
			stateValue: z.string(),
		})
		.optional(),
	newState: z.object({
		stateValue: z.string(),
	}),
});

type AlarmStateChange = {
	alarmName: string;
	timestamp: Date;
	toAlarmState: boolean;
};

function parseAlarmHistory(history: AlarmHistoryItem[]): AlarmStateChange[] {
	return history.flatMap((item) => {
		if (!item.HistoryData || !item.AlarmName || !item.Timestamp) {
			return [];
		}

		try {
			const parsed = AlarmHistoryDataSchema.parse(JSON.parse(item.HistoryData));
			const toAlarmState = parsed.newState.stateValue === 'ALARM';

			return [
				{
					alarmName: item.AlarmName,
					timestamp: item.Timestamp,
					toAlarmState,
				},
			];
		} catch (error) {
			console.error('Failed to parse alarm history data', error);
			return [];
		}
	});
}

function sentToAlarmsHandler(stage: string) {
	return (alarm: AlarmHistoryWithTags) =>
		(alarm.alarm.AlarmActions?.findIndex((alarmAction) =>
			alarmAction.endsWith('alarms-handler-topic-' + stage),
		) ?? -1) >= 0;
}

const actionsEnabled = (alarm: AlarmHistoryWithTags): boolean =>
	alarm.alarm.ActionsEnabled ?? true;

export async function getChatMessages(
	stage: string,
	alarmHistory: AlarmHistoryWithTags[],
	alarmMappings: AppToTeams,
	configuredWebhookUrls: WebhookUrls,
): Promise<Array<{ webhookUrl: string; payload: object; team: Team }>> {
	const relevantChanges: Array<{
		alarmName: string;
		count: number;
		tags: Lazy<Tags>;
	}> = alarmHistory
		.filter(sentToAlarmsHandler(stage))
		.filter(actionsEnabled)
		.map(({ history, tags, alarmName }) => {
			const count = parseAlarmHistory(history).filter(
				(change) => change.toAlarmState,
			).length;
			return { alarmName, count, tags };
		})
		.filter(({ count }) => count > 0);
	logger.log(`alarmHistory ${alarmHistory.length}`);
	logger.log(`relevantChanges ${relevantChanges.length}`);

	const teamToAlarmNameAndCount: Record<
		Team,
		Array<{
			readonly alarmName: string;
			readonly count: number;
		}>
	> = groupMap(
		(
			await Promise.all(
				relevantChanges.flatMap(async ({ alarmName, count, tags }) =>
					alarmMappings((await tags.get()).App).map(
						(team) => [team, { alarmName, count }] as const,
					),
				),
			)
		).flat(1),
		([team]) => team,
		([, alarmAndCount]) => alarmAndCount,
	);
	logger.log(
		`teamToAlarmNameAndCount ${objectKeys(teamToAlarmNameAndCount).length}`,
	);

	return objectEntries(teamToAlarmNameAndCount).map(([team, alarms]) => {
		const teamTotal = alarms.reduce((sum, alarm) => sum + alarm.count, 0);
		const alarmsList = alarms
			.sort((a, b) => b.count - a.count)
			.map((alarm) => {
				const alarmUrl =
					'https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/' +
					encodeURIComponent(alarm.alarmName).replaceAll('.', '%2E');

				return { ...alarm, alarmUrl };
			});
		const payload = buildCloudWatchSummaryMessage(teamTotal, alarmsList);
		return {
			team,
			webhookUrl: configuredWebhookUrls[team],
			payload,
		};
	});
}
