import type { MetricAlarm, Tag } from '@aws-sdk/client-cloudwatch';
import {
	CloudWatchClient,
	DescribeAlarmsCommand,
	ListTagsForResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { flatten } from '@modules/arrayFunctions';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getConfig } from './config';

const buildCrossAccountCloudwatchClient = (roleArn: string) => {
	const credentials = fromTemporaryCredentials({
		params: { RoleArn: roleArn },
	});

	return new CloudWatchClient({ region: 'eu-west-1', credentials });
};

export async function getCloudwatchClient(awsAccountId: string) {
	const clients = await cloudwatchClients.get();
	return clients[awsAccountId] ?? clients.defaultClient;
}

type CloudWatchClients = {
	[awsAccountId: string]: CloudWatchClient;
	defaultClient: CloudWatchClient;
};

export const cloudwatchClients: Lazy<CloudWatchClients> =
	new Lazy<CloudWatchClients>(() => {
		const mobile = {
			[getConfig('MOBILE_AWS_ACCOUNT_ID')]: buildCrossAccountCloudwatchClient(
				getConfig('MOBILE_ROLE_ARN'),
			),
		};
		const targeting = {
			[getConfig('TARGETING_AWS_ACCOUNT_ID')]:
				buildCrossAccountCloudwatchClient(getConfig('TARGETING_ROLE_ARN')),
		};
		const cloudWatchClients: CloudWatchClients = {
			defaultClient: new CloudWatchClient({ region: 'eu-west-1' }),
			...mobile,
			...targeting,
		};
		return Promise.resolve(cloudWatchClients);
	}, 'aws cross account details');

export type Tags = {
	App?: string;
	DiagnosticLinks?: string;
};

export const getTags = async (
	alarmArn: string,
	awsAccountId: string,
): Promise<Tags> =>
	getTagsWithClient(alarmArn, await getCloudwatchClient(awsAccountId));

const getTagsWithClient = async (
	alarmArn: string,
	client: CloudWatchClient,
): Promise<Tags> => {
	const request = new ListTagsForResourceCommand({
		ResourceARN: alarmArn,
	});

	const response = await client.send(request);
	const tags = response.Tags ?? [];
	const entries = tags.flatMap((tag: Tag) =>
		tag.Key && tag.Value ? [[tag.Key, tag.Value]] : [],
	);
	return Object.fromEntries(entries) as Tags;
};

async function getAlarmsInAlarmForClient(
	client: CloudWatchClient,
): Promise<AlarmWithTags[]> {
	const request = new DescribeAlarmsCommand({ StateValue: 'ALARM' });
	const response = await client.send(request);
	console.log(
		'next token should be empty to avoid missing alarms: ' + response.NextToken,
	);
	const metricAlarms = getIfDefined(
		response.MetricAlarms,
		'response didnt include MetricAlarms',
	);
	return metricAlarms.map((alarm) => {
		const alarmArn = getIfDefined(alarm.AlarmArn, 'no alarm ARN');
		return {
			alarm,
			tags: new Lazy(
				() => getTagsWithClient(alarmArn, client),
				'tags for ' + alarmArn,
			),
		};
	});
}

export type AlarmWithTags = { alarm: MetricAlarm; tags: Lazy<Tags> };

export const getAllAlarmsInAlarm: (
	cloudwatchClients: CloudWatchClients,
) => Promise<AlarmWithTags[]> = async (cloudwatchClients) => {
	return Promise.all(
		Object.entries(cloudwatchClients).map(async ([account, client]) => {
			console.log('checking account ' + account);
			return await getAlarmsInAlarmForClient(client);
		}),
	).then(flatten);
};
