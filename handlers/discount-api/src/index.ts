import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { stageFromEnvironment } from '../../../modules/stage';
import {
	applyDigiSubDiscount,
	DigitalSubscriptionSaveDiscount,
} from './digitalSubscriptionSaveDiscounts';
import { checkDefined } from './nullAndUndefined';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	const stage = stageFromEnvironment();
	switch (true) {
		case event.path === '/apply-digitalSub-discount' &&
			event.httpMethod === 'POST':
			const digitalSubscriptionSaveDiscount =
				new DigitalSubscriptionSaveDiscount(stage, catalogProductRatePlans);
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
