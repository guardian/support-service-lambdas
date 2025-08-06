import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { httpRouter } from './routers/http';
import {
	BatonEventRequest,
	BatonEventResponse,
} from './routers/baton/types-and-schemas';
import { batonRerRouter } from './routers/baton';
import { getAppConfig, getEnv } from './utils/config';
import { HandleSarStatus } from './routers/baton/handle-sar-status';

export const handlerHttp: Handler<
	APIGatewayProxyEvent,
	APIGatewayProxyResult
> = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		console.debug('Processing HTTP request');
		return httpRouter.routeRequest(event);
	} catch (error) {
		console.error('HTTP handler error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};

// this must be the same base key as we have permissions set in the CDK
const sarS3BaseKey = 'mparticle-results/';

export const handlerBaton: Handler<
	BatonEventRequest,
	BatonEventResponse
> = async (event: BatonEventRequest): Promise<BatonEventResponse> => {
	try {
		const { handleSarStatus } = await services();
		const router = batonRerRouter(handleSarStatus);
		console.debug('Processing Baton event');
		return router.routeRequest(event);
	} catch (error) {
		console.error('Baton handler error:', error);
		throw error; // Re-throw to trigger Lambda retry mechanism
	}
};

async function services() {
	console.log('Starting lambda');
	const config = await getAppConfig();
	return {
		handleSarStatus: new HandleSarStatus(
			config.sarResultsBucket,
			sarS3BaseKey,
			() => new Date(),
		),
		stage: getEnv('STAGE'),
	};
}
