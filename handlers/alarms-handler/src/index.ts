import type { SNSEventRecord, SQSEvent } from 'aws-lambda';
import {buildWebhookMappings, getTeam} from "./alarmMappings";
import {getAppNameTag} from "./cloudwatch";

const webhookMappings = buildWebhookMappings();

interface AlarmMessage {
	AlarmArn: string;
	AlarmName: string;
	AlarmDescription?: string;
	NewStateReason: string;
}

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

const processMessage = async (rawMessage: string): Promise<void> => {
	const message = JSON.parse(rawMessage) as AlarmMessage;

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

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			console.log(record);
			const recordBody = JSON.parse(record.body) as SNSEventRecord['Sns'];

			await processMessage(recordBody.Message);
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};
