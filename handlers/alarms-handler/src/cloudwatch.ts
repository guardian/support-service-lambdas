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
	defaultClient: CloudWatchClient;
};

export type Tags = {
	App?: string;
	DiagnosticLinks?: string;
};

export type AlarmWithTags = { alarm: MetricAlarm; tags: Lazy<Tags> };

export class Cloudwatch {
	private cloudwatchClients: CloudWatchClients;
	constructor(private config: Accounts) {
		const mobileArn = config.MOBILE.roleArn;
		const targetingArn = config.TARGETING.roleArn;
		this.cloudwatchClients = {
			defaultClient: new CloudWatchClient(awsConfig),
			mobile: buildCrossAccountCloudwatchClient(mobileArn, 'mobile'),
			targeting: buildCrossAccountCloudwatchClient(targetingArn, 'targeting'),
		};
	}

	// Use the awsAccountId of the alarm to decide which credentials are needed to fetch the alarm's tags
	private getCloudwatchClientForAccountId = (
		awsAccountId: string,
	): CloudWatchClient => {
		const accountIds = {
			[this.config.MOBILE.id]: 'mobile',
			[this.config.TARGETING.id]: 'targeting',
		} as const;
		return this.cloudwatchClients[accountIds[awsAccountId] ?? 'defaultClient'];
	};

	getTags = (alarmArn: string, awsAccountId: string): Promise<Tags> =>
		getTagsForClient(
			alarmArn,
			this.getCloudwatchClientForAccountId(awsAccountId),
		);

	getAllAlarmsInAlarm: () => Promise<AlarmWithTags[]> = () =>
		getAllAlarmsInAlarm(this.cloudwatchClients);
}

const getTagsForClient = async (
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
			tags: new Lazy(
				() => getTagsForClient(alarmArn, client),
				'tags for ' + alarmArn,
			),
		};
	});
}
