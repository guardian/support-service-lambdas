import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { contributionToSupporterPlusEndpoint } from './productSwitchEndpoint';
import { parseUrlPath } from './urlParsing';

const stage = process.env.STAGE as Stage;
export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	const response = await routeRequest(event);
	console.log(`Response is ${JSON.stringify(response)}`);
	return response;
};

const routeRequest = async (event: APIGatewayProxyEvent) => {
	try {
		const parsedUrlPath = parseUrlPath(event.path);
		if (
			parsedUrlPath.switchType === 'recurring-contribution-to-supporter-plus'
		) {
			const requestBody = getIfDefined(
				event.body,
				'No request body was provided in call to recurring-contribution-to-supporter-plus',
			);
			return await contributionToSupporterPlusEndpoint(
				stage,
				event.headers,
				requestBody,
				parsedUrlPath.subscriptionNumber,
			);
		} else {
			return {
				body: 'Not found',
				statusCode: 404,
			};
		}
	} catch (error) {
		console.log('Caught error in index.ts ', error);
		if (error instanceof ValidationError) {
			console.log(`Validation failure: ${error.message}`);
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
