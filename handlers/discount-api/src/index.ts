import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { stageFromEnvironment } from '../../../modules/stage';
import {
	applyDiscountEndpoint,
	checkEligibilityEndpoint,
} from './endpoints/applyDiscountEndpoint';
import { ValidationError } from './errors';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	const response = routeRequest(event);
	console.log(`Response is ${JSON.stringify(response)}`);
	return response;
};
const routeRequest = (event: APIGatewayProxyEvent) => {
	try {
		const stage = stageFromEnvironment();
		switch (true) {
			case event.path === '/apply-discount' && event.httpMethod === 'POST': {
				return applyDiscountEndpoint(stage, event.body);
			}
			case event.path === '/check-eligibility' && event.httpMethod === 'POST': {
				return checkEligibilityEndpoint(stage, event.body);
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
