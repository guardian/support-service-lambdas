import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { stageFromEnvironment } from '../../../modules/stage';
import {
	applyDiscountResponse,
	checkEligibilityResponse,
} from './endpoints/applyDiscountResponse';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		console.log(`Input is ${JSON.stringify(event)}`);
		const stage = stageFromEnvironment();
		switch (true) {
			case event.path === '/apply-discount' && event.httpMethod === 'POST': {
				return applyDiscountResponse(stage, event);
			}
			case event.path === '/check-eligibility' && event.httpMethod === 'POST': {
				return checkEligibilityResponse(stage, event);
			}
			default:
				return {
					body: 'Not found',
					statusCode: 404,
				};
		}
	} catch (error) {
		console.log(error);
		return {
			body: JSON.stringify(error),
			statusCode: 500,
		};
	}
};
