import {CloudWatchClient, ListTagsForResourceCommand} from "@aws-sdk/client-cloudwatch";
import type {
    ListTagsForResourceCommandOutput
} from "@aws-sdk/client-cloudwatch/dist-types/commands/ListTagsForResourceCommand";
import type {Tag} from "@aws-sdk/client-cloudwatch/dist-types/models/models_0";

const getTags = (alarmArn: string): Promise<Tag[]> => {
    const client = new CloudWatchClient({ region: "eu-west-1" });

    const request = new ListTagsForResourceCommand({
        ResourceARN: alarmArn
    });

    return client.send(request).then((response: ListTagsForResourceCommandOutput) => response.Tags ?? []);
}

export const getAppNameTag = (alarmArn: string): Promise<string | undefined> => {
    return getTags(alarmArn).then((tags: Tag[]) => {
        console.log({tags});
        return tags.find((tag: Tag) => tag.Key === 'App')?.Value;
    });
};
