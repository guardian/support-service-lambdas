import getWebhookValidationSecret from './hMacKey';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	//code for fetching webhook secret
	const webhookValidationSecret = getWebhookValidationSecret;
	//todo - remove the next line before you have an actual secret
	console.log(`webhookValidationSecret is: ${webhookValidationSecret}`);
	return await Promise.resolve({
		body: `Hello World, secret is: ${webhookValidationSecret}`,
		statusCode: 200,
	});
};
