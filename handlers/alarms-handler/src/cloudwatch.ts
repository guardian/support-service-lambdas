import {
	CloudWatchClient,
	ListTagsForResourceCommand,
} from '@aws-sdk/client-cloudwatch';
import type { Tag } from '@aws-sdk/client-cloudwatch/dist-types/models/models_0';

const getTags = async (alarmArn: string): Promise<Tag[]> => {
	const client = new CloudWatchClient({ region: 'eu-west-1' });

	const request = new ListTagsForResourceCommand({
		ResourceARN: alarmArn,
	});

	const response = await client.send(request);
	return response.Tags ?? [];
};

export const getAppNameTag = async (
	alarmArn: string,
): Promise<string | undefined> => {
	const tags = await getTags(alarmArn);
	return tags.find((tag: Tag) => tag.Key === 'App')?.Value;
};
