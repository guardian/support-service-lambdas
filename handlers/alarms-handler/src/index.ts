import type { SNSEventRecord, SQSEvent } from 'aws-lambda';
import {buildWebhookMappings} from "./alarmMappings";

interface AlarmMessage {
	AlarmName: string;
	AlarmDescription?: string;
	NewStateReason: string;
}

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		const webhookMappings = buildWebhookMappings();

		for (const record of event.Records) {
			console.log(record);
			const recordBody = JSON.parse(record.body) as SNSEventRecord['Sns'];

			let text: string;

			// TODO - get alarm ARN from the message, fetch the alarm's tags from AWS, and lookup the correct webhook based on the app

			try {
				const message = JSON.parse(recordBody.Message) as AlarmMessage;

				text = `*ALARM:* ${
					message.AlarmName
				} has triggered!\n\n*Description:* ${
					message.AlarmDescription ?? ''
				}\n\n*Reason:* ${message.NewStateReason}`;
			} catch (error) {
				text = recordBody.Message;
			}

			await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text }),
			});
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};
