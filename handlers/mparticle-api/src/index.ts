import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { baseUrlForStage, httpRouter } from './routers/http';
import {
	BatonRerEventRequest,
	BatonRerEventResponse,
} from './routers/baton/types-and-schemas';
import { batonRerRouter } from './routers/baton';
import { MParticleDataSubjectClient } from './apis/data-subject-requests';
import { getAppConfig, getEnv } from './utils/config';
import { MParticleEventsClient } from './apis/events';

export const handlerHttp: Handler<
	APIGatewayProxyEvent,
	APIGatewayProxyResult
> = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const { mParticleDataSubjectClient, mParticleEventsClient, stage } =
			await services();
		const router = httpRouter(
			mParticleDataSubjectClient,
			mParticleEventsClient,
			baseUrlForStage(stage),
		);

		console.debug('Processing HTTP request');
		return router.routeRequest(event);
	} catch (error) {
		console.error('HTTP handler error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};

export const handlerBaton: Handler<
	BatonRerEventRequest,
	BatonRerEventResponse
> = async (event: BatonRerEventRequest): Promise<BatonRerEventResponse> => {
	try {
		const { mParticleDataSubjectClient, mParticleEventsClient, stage } =
			await services();
		const router = batonRerRouter(
			mParticleDataSubjectClient,
			mParticleEventsClient,
			baseUrlForStage(stage),
			stage === 'PROD',
		);

		console.debug('Processing Baton RER event');
		return router.routeRequest(event);
	} catch (error) {
		console.error('Baton RER handler error:', error);
		throw error; // Re-throw to trigger Lambda retry mechanism
	}
};

async function services() {
	console.log('Starting lambda');
	const config = await getAppConfig();
	return {
		mParticleDataSubjectClient: MParticleDataSubjectClient.create(
			config.workspace,
		),
		mParticleEventsClient: MParticleEventsClient.create(
			config.inputPlatform,
			config.pod,
		),
		stage: getEnv('STAGE'),
	};
}
