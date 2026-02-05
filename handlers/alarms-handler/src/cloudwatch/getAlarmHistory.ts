import type {
	AlarmHistoryItem,
	CloudWatchClient,
	CompositeAlarm,
	MetricAlarm,
} from '@aws-sdk/client-cloudwatch';
import {
	DescribeAlarmHistoryCommand,
	DescribeAlarmsCommand,
	HistoryItemType,
} from '@aws-sdk/client-cloudwatch';
import { chunkArray, flatten, groupBy } from '@modules/arrayFunctions';
import { fetchAllPages } from '@modules/aws/fetchAllPages';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	objectFromEntries,
	objectInnerJoin,
	objectKeys,
} from '@modules/objectFunctions';
import { logger } from '@modules/routing/logger';
import type { Dayjs } from 'dayjs';
import type { Tags } from './getTags';
import { getTags } from './getTags';

export type AlarmHistoryWithTags = {
	history: AlarmHistoryItem[];
	tags: Lazy<Tags>;
	alarm: CompositeAlarm | MetricAlarm;
	alarmName: string;
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
				getIfDefined(
					item.AlarmName,
					"missing alarm name shouldn't be possible",
				),
			);
			const arnForAlarmNameLookup = await getAlarms(
				objectKeys(eachAlarmWithHistory),
				client,
			);
			// need to use an inner join because if an alarm is deleted there's no way to get its arn back
			const alarmAndHistorys = objectInnerJoin(
				arnForAlarmNameLookup,
				eachAlarmWithHistory,
			);
			const alarmHistoryWithTags = alarmAndHistorys.map(
				([alarm, history, alarmName]) => {
					const lazyTags = new Lazy(
						() => getTags(getIfDefined(alarm.AlarmArn, ''), client),
						'tags for ' + alarm.AlarmArn,
					);
					return {
						history,
						tags: lazyTags,
						alarm,
						alarmName,
					} satisfies AlarmHistoryWithTags;
				},
			);
			return alarmHistoryWithTags;
		}),
	).then(flatten);
}

// https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_DescribeAlarms.html#:~:text=Maximum%20number%20of%20100%20items
const maxDescribeAlarmsArrayLength = 100;

const getAlarms = async (
	alarmNames: string[],
	client: CloudWatchClient,
): Promise<Record<string, CompositeAlarm | MetricAlarm>> => {
	logger.log(`fetching alarm info for ${alarmNames.length} alarms`);
	const alarmNamesChunks = chunkArray(alarmNames, maxDescribeAlarmsArrayLength);
	return objectFromEntries(
		(
			await Promise.all(
				alarmNamesChunks.map(
					async (alarmNamesChunk) =>
						await fetchAllPages('DescribeAlarmsCommand', async (token) => {
							const request = new DescribeAlarmsCommand({
								AlarmNames: alarmNamesChunk,
								NextToken: token,
							});

							const response = await client.send(request);
							const nameAndArns = [
								...(response.CompositeAlarms?.flatMap((alarm) => [
									[
										getIfDefined(
											alarm.AlarmName,
											'invalid response from describe alarms',
										),
										alarm,
									] as const,
								]) ?? []),
								...(response.MetricAlarms?.flatMap((alarm) => [
									[
										getIfDefined(
											alarm.AlarmName,
											'invalid response from describe alarms',
										),
										alarm,
									] as const,
								]) ?? []),
							];
							return { nextToken: response.NextToken, thisPage: nameAndArns };
						}),
				),
			)
		).flat(1),
	);
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
