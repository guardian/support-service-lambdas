import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { applyDigiSubDiscount } from './digitalSubSaveDiscounts';
import { checkDefined } from './zuora/common';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	switch (true) {
		case event.path === '/apply-digitalSub-discount' &&
			event.httpMethod === 'POST':
			return await applyDigiSubDiscount(
				checkDefined(event.body, 'No body was provided'),
			);
		default:
			return await Promise.resolve({
				body: 'Hello World',
				statusCode: 200,
			});
	}
};
