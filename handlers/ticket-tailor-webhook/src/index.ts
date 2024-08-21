import type { Stage } from '@modules/stage';
import type { APIGatewayProxyResult, Handler, SQSEvent } from 'aws-lambda';
import { getWebhookValidationSecret } from './hMacKey';
import type { Payload } from './verifySignature';
import { hasMatchingSignature } from './verifySignature';

export const handler: Handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult> => {
	const res = await event.Records.flatMap(async (record) => {
		console.log(`Processing TT Webhook. Message id is: ${record.messageId}`);
		const stage = process.env.STAGE as Stage;
		const validationSecret = await getWebhookValidationSecret(stage);
		const matches = hasMatchingSignature(record, validationSecret);
		if (matches) {
			const payload = JSON.parse(record.body) as Payload;
			const email = payload.payload.buyer_details.email;
			return callIdapi(email);
		} else {
			throw new Error(
				'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS.',
			);
		}
	}).at(0);

	if (res) {
		return res;
	} else {
		throw new Error('Unknown Error');
	}
};

export const callIdapi = (email: string) => {
	console.log(`email for idapi ${email}`);
	return Promise.resolve({
		statusCode: 200,
		body: `Hello World`,
	});
};
