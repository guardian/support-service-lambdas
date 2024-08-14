//import getWebhookValidationSecret from './hMacKey';
import type {
	APIGatewayProxyResult,
	Handler,
	SQSEvent,
} from 'aws-lambda';
import { getWebhookValidationSecret } from './hMacKey';
import { createHmac ,timingSafeEqual} from "node:crypto";

//import type { Stage } from '@modules/stage'



export const handler: Handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

		
	//code for fetching webhook secret
	// const stage =  Stage("CODE") ???//
	const webhookValidationSecret = await getWebhookValidationSecret('CODE');

	// Tickettailor-Webhook-Signature
	
	 event.Records.forEach((record) => {
		const body = record.body
	const hash = createHmac('sha256', webhookValidationSecret)
	                .update(body)
	                .digest('hex');


	timingSafeEqual( Buffer.from(hash), Buffer.from(hash))

	console.log(hash)
	//todo - remove the next line before you have an actual secret

}
	);

	return  Promise.resolve({
		body: `Hello World,}`,
		statusCode: 200,
	});

};
