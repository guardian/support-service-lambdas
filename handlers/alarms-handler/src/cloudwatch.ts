import type { AlarmHistoryItem } from '@aws-sdk/client-cloudwatch';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { awsConfig, getAwsConfig, isRunningLocally } from '@modules/aws/config';
import type { Dayjs } from 'dayjs';
import { getAlarmHistory } from './cloudwatch/getAlarmHistory';
import type { AlarmWithTags } from './cloudwatch/getAllAlarmsInAlarm';
import { getAllAlarmsInAlarm } from './cloudwatch/getAllAlarmsInAlarm';
import type { Tags } from './cloudwatch/getTags';
import { getTags } from './cloudwatch/getTags';
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

export type Cloudwatch = {
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>;
	getAllAlarmsInAlarm: () => Promise<AlarmWithTags[]>;
	getAlarmHistory: (now: Date) => Promise<AlarmHistoryItem[]>;
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
		getAlarmHistory: (now: Dayjs) => getAlarmHistory(cloudwatchClients, now),
	};
};
