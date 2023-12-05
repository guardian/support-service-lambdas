import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { stageFromEnvironment } from '../../../modules/stage';
import {
	applyDiscountResponse,
	checkEligibility,
} from './endpoints/applyDiscountResponse';
import { ValidationError } from './errors';

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
				return checkEligibility(stage, event);
			}
			default:
				return {
					body: 'Not found',
					statusCode: 404,
				};
		}
	} catch (error) {
		console.log(error);
		if (error instanceof ValidationError) {
			return {
				body: error.message,
				statusCode: 400,
			};
		} else {
			return {
				body: JSON.stringify(error),
				statusCode: 500,
			};
		}
	}
};
