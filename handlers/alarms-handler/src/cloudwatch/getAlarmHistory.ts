import type {
	AlarmHistoryItem,
	CloudWatchClient,
} from '@aws-sdk/client-cloudwatch';
import {
	DescribeAlarmHistoryCommand,
	DescribeAlarmsCommand,
	HistoryItemType,
} from '@aws-sdk/client-cloudwatch';
import {
	chunkArray,
	flatten,
	groupBy,
	groupByUniqueOrThrow,
} from '@modules/arrayFunctions';
import { fetchAllPages } from '@modules/aws/fetchAllPages';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectInnerJoin, objectKeys } from '@modules/objectFunctions';
import { logger } from '@modules/routing/logger';
import type { Dayjs } from 'dayjs';
import type { Tags } from './getTags';
import { getTags } from './getTags';

export type AlarmHistoryWithTags = {
	history: AlarmHistoryItem[];
	tags: Lazy<Tags>;
	alarm: AlarmData;
};

export async function getAlarmHistory(
	cloudwatchClients: Record<string, CloudWatchClient>,
	now: Dayjs,
): Promise<AlarmHistoryWithTags[]> {
	const startDate = now.subtract(7, 'days');

	return await Promise.all(
		Object.entries(cloudwatchClients).map(async ([accountName, client]) => {
			console.log('fetching alarm history for account ' + accountName);
			const alarmHistoryItems = await getAlarmHistoryForClient(
				client,
				startDate,
				now,
			);

			const eachAlarmWithHistory = groupBy(alarmHistoryItems, (item) =>
				get(item.AlarmName),
			);
			const arnForAlarmNameLookup = groupByUniqueOrThrow(
				await getAlarms(objectKeys(eachAlarmWithHistory), client),
				(a) => a.name,
				'duplicate alarm name should not be possible',
			);
			// if an alarm is deleted there's no way to get its arn back, it doesn't return a record
			// from getAlarms, so it will be dropped from the join and ignored
			const alarmHistoryWithTags: AlarmHistoryWithTags[] = objectInnerJoin(
				arnForAlarmNameLookup,
				eachAlarmWithHistory,
			).map(([alarm, history]) => {
				const lazyTags = new Lazy(
					() => getTags(alarm.arn, client),
					'tags for ' + alarm.arn,
				);
				return {
					history,
					tags: lazyTags,
					alarm,
				} satisfies AlarmHistoryWithTags;
			});
			return alarmHistoryWithTags;
		}),
	).then(flatten);
}

export type AlarmData = {
	arn: string;
	name: string;
	actionsEnabled: boolean;
	actions: string[];
};

// https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_DescribeAlarms.html#:~:text=Maximum%20number%20of%20100%20items
const maxDescribeAlarmsArrayLength = 100;

function get<T>(value: T | undefined) {
	return getIfDefined(value, 'missing required value');
}

const getAlarms = async (
	alarmNames: string[],
	client: CloudWatchClient,
): Promise<AlarmData[]> => {
	logger.log(`fetching alarm info for ${alarmNames.length} alarms`);
	const alarmNamesChunks = chunkArray(alarmNames, maxDescribeAlarmsArrayLength);
	return (
		await Promise.all(
			alarmNamesChunks.map(
				async (alarmNamesChunk) =>
					await fetchAllPages('DescribeAlarmsCommand', async (token) => {
						const request = new DescribeAlarmsCommand({
							AlarmNames: alarmNamesChunk,
							NextToken: token,
						});

						const response = await client.send(request);
						const nameAndData = [
							...(response.CompositeAlarms?.flatMap((alarm) => [
								{
									arn: get(alarm.AlarmArn),
									name: get(alarm.AlarmName),
									actionsEnabled: get(alarm.ActionsEnabled),
									actions: get(alarm.AlarmActions),
								} satisfies AlarmData,
							]) ?? []),
							...(response.MetricAlarms?.flatMap((alarm) => [
								{
									arn: get(alarm.AlarmArn),
									name: get(alarm.AlarmName),
									actionsEnabled: get(alarm.ActionsEnabled),
									actions: get(alarm.AlarmActions),
								} satisfies AlarmData,
							]) ?? []),
						];
						return { nextToken: response.NextToken, thisPage: nameAndData };
					}),
			),
		)
	).flat(1);
};
const getAlarmHistoryForClient = async (
	client: CloudWatchClient,
	startDate: Dayjs,
	endDate: Dayjs,
): Promise<AlarmHistoryItem[]> =>
	fetchAllPages('DescribeAlarmHistoryCommand', async (token) => {
		const request = new DescribeAlarmHistoryCommand({
			HistoryItemType: HistoryItemType.StateUpdate,
			StartDate: startDate.toDate(),
			EndDate: endDate.toDate(),
			NextToken: token,
		});
		const response = await client.send(request);
		return {
			nextToken: response.NextToken,
			thisPage: response.AlarmHistoryItems ?? [],
		};
	});
