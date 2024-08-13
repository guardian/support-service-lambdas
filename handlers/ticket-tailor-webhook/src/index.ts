//import getWebhookValidationSecret from './hMacKey';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { getWebhookValidationSecret } from './hMacKey';
//import type { Stage } from '@modules/stage'

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	//code for fetching webhook secret
	//val stage: Stage = new Stage("CODE")
	const webhookValidationSecret = await getWebhookValidationSecret('CODE');
	//todo - remove the next line before you have an actual secret
	console.log(`webhookValidationSecret is: ${webhookValidationSecret}`);
	return await Promise.resolve({
		body: `Hello World, secret is: ${webhookValidationSecret}`,
		statusCode: 200,
	});
};
