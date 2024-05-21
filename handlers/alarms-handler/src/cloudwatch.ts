import {
	CloudWatchClient,
	ListTagsForResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import type { Tag } from '@aws-sdk/client-cloudwatch';
import {fromTemporaryCredentials} from "@aws-sdk/credential-providers";
import { checkDefined } from '@modules/nullAndUndefined';

// Use the awsAccountId of the alarm to decide which credentials are needed to fetch the alarm's tags
const buildCloudwatchClient = (awsAccountId: string): CloudWatchClient => {
	const mobileAccountId = checkDefined<string>(
		process.env['MOBILE_AWS_ACCOUNT_ID'],
		'MOBILE_AWS_ACCOUNT_ID environment variable not set',
	);

	if (awsAccountId === mobileAccountId) {
		console.log('Using mobile account credentials to fetch tags');

		const roleArn = checkDefined<string>(
			process.env['MOBILE_ROLE_ARN'],
			'MOBILE_ROLE_ARN environment variable not set',
		);
		const credentials = fromTemporaryCredentials({
			params: { RoleArn: roleArn },
		});
		return new CloudWatchClient({ region: 'eu-west-1', credentials });
	}

	return new CloudWatchClient({ region: 'eu-west-1' });
}

const getTags = async (
	alarmArn: string,
	awsAccountId: string,
): Promise<Tag[]> => {
	const client = buildCloudwatchClient(awsAccountId);

	const request = new ListTagsForResourceCommand({
		ResourceARN: alarmArn,
	});

	const response = await client.send(request);
	return response.Tags ?? [];
};

export const getAppNameTag = async (
	alarmArn: string,
	awsAccountId: string,
): Promise<string | undefined> => {
	const tags = await getTags(alarmArn, awsAccountId);
	return tags.find((tag: Tag) => tag.Key === 'App')?.Value;
};
