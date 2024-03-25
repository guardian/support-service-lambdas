import { checkDefined } from '@modules/nullAndUndefined';
import type { SNSEventRecord, SQSEvent } from 'aws-lambda';

interface AlarmMessage {
	AlarmName: string;
	AlarmDescription?: string;
	NewStateReason: string;
}

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		const webhookUrl = checkDefined<string>(
			process.env.WEBHOOK,
			'WEBHOOK environment variable not set',
		);

		for (const record of event.Records) {
			console.log(record);
			const recordBody = JSON.parse(record.body) as SNSEventRecord['Sns'];
			const message = JSON.parse(recordBody.Message) as AlarmMessage;

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
	} catch (error) {
		console.error(error);
		throw error;
	}
};
