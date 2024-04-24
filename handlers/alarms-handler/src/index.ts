import type { SNSEventRecord, SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import { buildWebhookMappings, getTeam } from "./alarmMappings";
import { getAppNameTag } from "./cloudwatch";

const webhookMappings = buildWebhookMappings();

const alarmMessageSchema = z.object({
	AlarmArn: z.string(),
	AlarmName: z.string(),
	AlarmDescription: z.string().optional(),
	NewStateReason: z.string(),
});

type AlarmMessage = z.infer<typeof alarmMessageSchema>;

const getWebhookUrl = async (message: AlarmMessage): Promise<string> => {
	const appName = await getAppNameTag(message.AlarmArn);
	if (!appName) {
		console.log(`Unable to find App tag for alarm ARN: ${message.AlarmArn}, defaulting to SRE`);
		return webhookMappings['SRE'];
	} else {
		const teamName = getTeam(appName);
		return webhookMappings[teamName];
	}
}

const processCloudwatchMessage = async (message: AlarmMessage): Promise<void> => {
	const webhookUrl = await getWebhookUrl(message);

	const text = `*ALARM:* ${
		message.AlarmName
	} has triggered!\n\n*Description:* ${
		message.AlarmDescription ?? ''
	}\n\n*Reason:* ${message.NewStateReason}`;

	await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text }),
	});
}

// Not a cloudwatch alarm, just send the whole message to the SRE channel
const processOtherMessage = async (message: string): Promise<void> => {
	await fetch(webhookMappings['SRE'], {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: message,
	});
}

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			console.log(record);
			const recordBody = JSON.parse(record.body) as SNSEventRecord['Sns'];

			const alarmMessage = alarmMessageSchema.safeParse(recordBody.Message);
			if (alarmMessage.success) {
				await processCloudwatchMessage(alarmMessage.data);
			} else {
				console.log(`Message is not a cloudwatch alarm: ${alarmMessage.error.message}`);
				await processOtherMessage(recordBody.Message);
			}
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};
