import type { MetricAlarm, Tag } from '@aws-sdk/client-cloudwatch';
import {
	CloudWatchClient,
	DescribeAlarmsCommand,
	ListTagsForResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { flatten } from '@modules/arrayFunctions';
import { awsConfig, getAwsConfig, isRunningLocally } from '@modules/aws/config';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Accounts } from './config';

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

export type Cloudwatch = {
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>;
	getAllAlarmsInAlarm: () => Promise<AlarmWithTags[]>;
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
		tag.Key && tag.Value ? [[tag.Key, tag.Value]] : [],
	);
	return Object.fromEntries(entries) as Tags;
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
			tags: new Lazy(() => getTags(alarmArn, client), 'tags for ' + alarmArn),
		};
	});
}
