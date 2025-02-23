import {
	CloudWatchClient,
	ListTagsForResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import type { Tag } from '@aws-sdk/client-cloudwatch';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { getIfDefined } from '@modules/nullAndUndefined';

const buildCrossAccountCloudwatchClient = (roleArn: string) => {
	const credentials = fromTemporaryCredentials({
		params: { RoleArn: roleArn },
	});

	return new CloudWatchClient({ region: 'eu-west-1', credentials });
};

// Use the awsAccountId of the alarm to decide which credentials are needed to fetch the alarm's tags
const buildCloudwatchClient = (awsAccountId: string): CloudWatchClient => {
	const mobileAccountId = getIfDefined<string>(
		process.env['MOBILE_AWS_ACCOUNT_ID'],
		'MOBILE_AWS_ACCOUNT_ID environment variable not set',
	);
	if (awsAccountId === mobileAccountId) {
		console.log('Using mobile account credentials to fetch tags');

		const roleArn = getIfDefined<string>(
			process.env['MOBILE_ROLE_ARN'],
			'MOBILE_ROLE_ARN environment variable not set',
		);

		return buildCrossAccountCloudwatchClient(roleArn);
	}

	const targetingAccountId = getIfDefined<string>(
		process.env['TARGETING_AWS_ACCOUNT_ID'],
		'TARGETING_AWS_ACCOUNT_ID environment variable not set',
	);
	if (awsAccountId === targetingAccountId) {
		console.log('Using targeting account credentials to fetch tags');

		const roleArn = getIfDefined<string>(
			process.env['TARGETING_ROLE_ARN'],
			'TARGETING_ROLE_ARN environment variable not set',
		);

		return buildCrossAccountCloudwatchClient(roleArn);
	}

	return new CloudWatchClient({ region: 'eu-west-1' });
};

export type Tags = {
	App?: string;
	DiagnosticLinks?: string;
};

export const getTags = async (
	alarmArn: string,
	awsAccountId: string,
): Promise<Tags> => {
	const client = buildCloudwatchClient(awsAccountId);

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
