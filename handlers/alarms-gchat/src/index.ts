import type {
	Handler,
	SNSEvent
} from 'aws-lambda';

interface AlarmMessage {
	AlarmName: string;
	AlarmDescription?: string;
	NewStateReason: string;
}

export const handler: Handler = async (
	event: SNSEvent,
): Promise<null> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const webhookUrl = process.env.WEBHOOK;

	if (!webhookUrl) {
		console.error('No webhook provided');
		return null;
	}

	const messages: string[] = event.Records.map(record => {
		const message = JSON.parse(record.Sns.Message) as AlarmMessage;
		return `ALARM: ${message.AlarmName} has triggered!\n\nDescription: ${message.AlarmDescription ?? ''}\n\nReason: ${message.NewStateReason}}`
	});

	const responses = messages.map(message => {
		console.log(`Sending: ${message}`);
		return fetch(webhookUrl, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({
				text: message,
			}),
		});
	});

	return Promise.all(responses).then((responses) => {
		responses.forEach(response => {
			console.log(`Response: ${response.status}`);
		});
		return null
	})
};
