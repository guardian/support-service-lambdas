import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import {
	DescribeAlarmsCommand,
	type MetricAlarm,
} from '@aws-sdk/client-cloudwatch';
import { flatten } from '@modules/arrayFunctions';
import { fetchAllPages } from '@modules/aws/fetchAllPages';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import type { Tags } from './getTags';
import { getTags } from './getTags';

export type AlarmWithTags = { alarm: MetricAlarm; tags: Lazy<Tags> };

export async function getAllAlarmsInAlarm(
	cloudwatchClients: Record<string, CloudWatchClient>,
): Promise<AlarmWithTags[]> {
	return Promise.all(
		Object.entries(cloudwatchClients).map(async ([accountName, client]) => {
			logger.log('checking account ' + accountName);
			return await getAlarmsInAlarmForClient(client);
		}),
	).then(flatten);
}

const getAlarmsInAlarmForClient = async (
	client: CloudWatchClient,
): Promise<AlarmWithTags[]> =>
	fetchAllPages('DescribeAlarmsCommand', async (token) => {
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
