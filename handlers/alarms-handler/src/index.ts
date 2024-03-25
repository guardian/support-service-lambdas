import { checkDefined } from '@modules/nullAndUndefined';
import type { SQSEvent, SQSRecord } from 'aws-lambda';

// interface AlarmMessage {
// 	AlarmName: string;
// 	AlarmDescription?: string;
// 	NewStateReason: string;
// }

export const handler = async (event: SQSEvent): Promise<void> => {
	await Promise.resolve();

	const webhookUrl = checkDefined<string>(
		process.env.WEBHOOK,
		'WEBHOOK environment variable not set',
	);

	console.log(webhookUrl);

	try {
		for (const record of event.Records) {
			const recordBody = JSON.parse(record.body) as SQSRecord;
			console.log(recordBody);
			// const snsMessage = recordBody.body as SNSEventRecord;
			// const stripeEvent = body.detail as Stripe.CheckoutSessionCompletedEvent;
			// const sessionId = stripeEvent.data.object.id;
			// const { error } = await sendEmail({ sessionId });

			// if (error) {
			// 	console.error(error);

			// 	throw new Error('Could not process SQS event record');
			// }
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

// export const handler: Handler = async (event: SQSEvent): Promise<null> => {
// 	console.log(`Input is ${JSON.stringify(event)}`);

// 	const webhookUrl = process.env.WEBHOOK;

// 	if (!webhookUrl) {
// 		console.error('No webhook provided');
// 		return null;
// 	}

// 	const messages: string[] = event.Records.map((record) => {
// 		const message = JSON.parse(record.Sns.Message) as AlarmMessage;
// 		return `*ALARM:* ${message.AlarmName} has triggered!\n\n*Description:* ${
// 			message.AlarmDescription ?? ''
// 		}\n\n*Reason:* ${message.NewStateReason}}`;
// 	});

// 	const responses = messages.map((message) => {
// 		console.log(`Sending: ${message}`);
// 		return fetch(webhookUrl, {
// 			method: 'POST',
// 			headers: { 'Content-Type': 'application/json' },
// 			body: JSON.stringify({
// 				text: message,
// 			}),
// 		});
// 	});

// 	return Promise.all(responses).then((responses) => {
// 		responses.forEach((response) => {
// 			console.log(`Response: ${response.status}`);
// 		});
// 		return null;
// 	});
// };
