import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { stageFromEnvironment } from '../../../modules/stage';
import { applyDiscountResponse } from './endpoints/applyDiscountResponse';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Input is ${JSON.stringify(event)}`);
		const stage = stageFromEnvironment();
		switch (true) {
			case event.path === '/apply-digitalSub-discount' &&
				event.httpMethod === 'POST': {
				return applyDiscountResponse(stage, event);
			}
			default:
				return await Promise.resolve({
					body: 'Hello World',
					statusCode: 200,
				});
		}
	} catch (error) {
		console.log(error);
		return {
			body: JSON.stringify(error),
			statusCode: 500,
		};
	}
};
