//import getWebhookValidationSecret from './hMacKey';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { APIGatewayProxyResult, Handler, SQSEvent } from 'aws-lambda';
import { getWebhookValidationSecret } from './hMacKey';

//import type { Stage } from '@modules/stage'

export const handler: Handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	// const stage =  Stage("CODE") ???//
	const webhookValidationSecret = await getWebhookValidationSecret('CODE');

	event.Records.forEach((record) => {
		const email = JSON.parse(record.body).buyer_details.email;
		const hash = createHmac('sha256', webhookValidationSecret)
			.update(record.body)
			.digest('hex');

			const signature = record.messageAttributes['Tickettailor-Webhook-Signature']?.stringValue

			if (typeof signature === 'string') {
				timingSafeEqual(Buffer.from(hash), Buffer.from(signature)) ? callIdapi(email) : console.error("HMAC signatures do not match");
				
			}
			record

		

		console.log(hash);
		//todo - remove the next line before you have an actual secret
	});

	return Promise.resolve({
		body: `Hello World`,
		statusCode: 200,
	});
};

export const callIdapi = async (email: String): Promise<void> => {
	console.log(email)
}
