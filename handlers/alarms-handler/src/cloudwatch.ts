import type {
	AlarmHistoryItem,
	CompositeAlarm,
	MetricAlarm,
	Tag,
} from '@aws-sdk/client-cloudwatch';
import {
	CloudWatchClient,
	DescribeAlarmHistoryCommand,
	DescribeAlarmsCommand,
	HistoryItemType,
	ListTagsForResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { chunkArray, flatten, groupBy } from '@modules/arrayFunctions';
import { awsConfig, getAwsConfig, isRunningLocally } from '@modules/aws/config';
import { fetchAllPages } from '@modules/aws/fetchAllPages';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	objectFromEntries,
	objectInnerJoin,
	objectKeys,
} from '@modules/objectFunctions';
import { logger } from '@modules/routing/logger';
import type { Accounts } from './configSchema';

const buildCrossAccountCloudwatchClient = (
	roleArn: string,
	profile: string,
) => {
	const config = isRunningLocally
		? getAwsConfig(profile)
		: {
				region: 'eu-west-1',
				credentials: fromTemporaryCredentials({ params: { RoleArn: roleArn } }),
			};

	return new CloudWatchClient(config);
};

type CloudWatchClients = {
	mobile: CloudWatchClient;
	targeting: CloudWatchClient;
	membership: CloudWatchClient;
};

export type AlarmWithTags = { alarm: MetricAlarm; tags: Lazy<Tags> };

export type AlarmHistoryWithTags = {
	history: AlarmHistoryItem[];
	tags: Lazy<Tags>;
	alarm: CompositeAlarm | MetricAlarm;
	alarmName: string;
};

export type Cloudwatch = {
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>;
	getAllAlarmsInAlarm: () => Promise<AlarmWithTags[]>;
	getAlarmHistory: (
		startDate: Date,
		endDate: Date,
	) => Promise<AlarmHistoryItem[]>;
};

export const buildCloudwatch = (config: Accounts) => {
	const { MOBILE, TARGETING } = config;
	const cloudwatchClients: CloudWatchClients = {
		membership: new CloudWatchClient(awsConfig),
		mobile: buildCrossAccountCloudwatchClient(MOBILE.roleArn, 'mobile'),
		targeting: buildCrossAccountCloudwatchClient(
			TARGETING.roleArn,
			'targeting',
		),
	};

	// Use the awsAccountId of the alarm to decide which credentials are needed to fetch the alarm's tags
	const buildCloudwatchClient = (awsAccountId: string): CloudWatchClient => {
		const accountIds = {
			[config.MOBILE.id]: 'mobile',
			[config.TARGETING.id]: 'targeting',
		} as const;
		return cloudwatchClients[accountIds[awsAccountId] ?? 'membership'];
	};

	return {
		getTags: (alarmArn: string, awsAccountId: string) =>
			getTags(alarmArn, buildCloudwatchClient(awsAccountId)),
		getAllAlarmsInAlarm: () => getAllAlarmsInAlarm(cloudwatchClients),
		getAlarmHistory: (startDate: Date, endDate: Date) =>
			getAlarmHistory(cloudwatchClients, startDate, endDate),
	};
};

export type Tags = {
	App?: string;
	DiagnosticLinks?: string;
};

const getTags = async (
	alarmArn: string,
	client: CloudWatchClient,
): Promise<Tags> => {
	const request = new ListTagsForResourceCommand({
		ResourceARN: alarmArn,
	});

	const response = await client.send(request);
	const tags = response.Tags ?? [];
	const entries = tags.flatMap((tag: Tag) =>
		tag.Key && tag.Value ? [[tag.Key, tag.Value] as const] : [],
	);
	return objectFromEntries(entries);
};

const getAlarms = async (
	alarmNames: string[],
	client: CloudWatchClient,
): Promise<Record<string, CompositeAlarm | MetricAlarm>> => {
	logger.log(`fetching alarm info for ${alarmNames.length} alarms`);
	const alarmNamesChunks = chunkArray(alarmNames, 100);
	return objectFromEntries(
		(
			await Promise.all(
				alarmNamesChunks.map(
					async (alarmNamesChunk) =>
						await fetchAllPages(async (token) => {
							const request = new DescribeAlarmsCommand({
								AlarmNames: alarmNamesChunk,
								NextToken: token,
							});

							const response = await client.send(request);
							logger.log(
								'-- response.CompositeAlarms',
								response.CompositeAlarms?.length,
							);
							logger.log(
								'-- response.MetricAlarms',
								response.MetricAlarms?.length,
							);
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
						}, 'DescribeAlarmsCommand'),
				),
			)
		).flat(1),
	);
};

export async function getAllAlarmsInAlarm(
	cloudwatchClients: Record<string, CloudWatchClient>,
): Promise<AlarmWithTags[]> {
	return Promise.all(
		Object.entries(cloudwatchClients).map(async ([accountName, client]) => {
			console.log('checking account ' + accountName);
			return await getAlarmsInAlarmForClient(client);
		}),
	).then(flatten);
}

const getAlarmsInAlarmForClient = async (
	client: CloudWatchClient,
): Promise<AlarmWithTags[]> =>
	fetchAllPages(async (token) => {
		const request = new DescribeAlarmsCommand({
			StateValue: 'ALARM',
			NextToken: token,
		});
		const response = await client.send(request);
		const metricAlarms = getIfDefined(
			response.MetricAlarms,
			'response didnt include MetricAlarms',
		);
		return {
			nextToken: response.NextToken,
			thisPage: metricAlarms.map((alarm) => {
				const alarmArn = getIfDefined(alarm.AlarmArn, 'no alarm ARN');
				return {
					alarm,
					tags: new Lazy(
						() => getTags(alarmArn, client),
						'tags for ' + alarmArn,
					),
				};
			}),
		};
	});

const getAlarmHistoryForClient = async (
	client: CloudWatchClient,
	startDate: Date,
	endDate: Date,
): Promise<AlarmHistoryItem[]> =>
	fetchAllPages(async (token) => {
		const request = new DescribeAlarmHistoryCommand({
			HistoryItemType: HistoryItemType.StateUpdate,
			StartDate: startDate,
			EndDate: endDate,
			NextToken: token,
		});
		const response = await client.send(request);
		return {
			nextToken: response.NextToken,
			thisPage: response.AlarmHistoryItems ?? [],
		};
	}, 'DescribeAlarmHistoryCommand');

async function getAlarmHistory(
	cloudwatchClients: Record<string, CloudWatchClient>,
	startDate: Date,
	endDate: Date,
): Promise<AlarmHistoryWithTags[]> {
	return await Promise.all(
		Object.entries(cloudwatchClients).map(async ([accountName, client]) => {
			console.log('fetching alarm history for account ' + accountName);
			const alarmHistoryItems = await getAlarmHistoryForClient(
				client,
				startDate,
				endDate,
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
