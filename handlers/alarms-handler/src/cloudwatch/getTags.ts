import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import {
	ListTagsForResourceCommand,
	type Tag,
} from '@aws-sdk/client-cloudwatch';
import { objectFromEntries } from '@modules/objectFunctions';

export type Tags = {
	App?: string;
	DiagnosticLinks?: string;
};
export const getTags = async (
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
