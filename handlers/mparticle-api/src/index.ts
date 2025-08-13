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
import { AppConfig, getAppConfig, getEnv } from './utils/config';
import { MParticleClient } from './apis/mparticleClient';
import { SRS3ClientImpl } from './apis/srs3Client';

export const handlerHttp: Handler<
	APIGatewayProxyEvent,
	APIGatewayProxyResult
> = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const { mParticleDataSubjectClient, mParticleEventsAPIClient, isProd } =
			await services();
		console.debug('Processing HTTP request');
		return httpRouter(
			mParticleDataSubjectClient,
			mParticleEventsAPIClient,
			isProd,
		).routeRequest(event);
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
		const {
			mParticleDataSubjectClient,
			mParticleEventsAPIClient,
			srs3Client,
			isProd,
		} = await services();
		const router = batonRerRouter(
			mParticleDataSubjectClient,
			mParticleEventsAPIClient,
			isProd,
			srs3Client,
		);
		console.debug('Processing Baton event');
		return router.routeRequest(event);
	} catch (error) {
		console.error('Baton handler error:', error);
		throw error; // Re-throw to trigger Lambda retry mechanism
	}
};

async function services() {
	console.log('Starting lambda');
	const stage = getEnv('STAGE');
	const config: AppConfig = await getAppConfig();
	return {
		mParticleDataSubjectClient:
			MParticleClient.createMParticleDataSubjectClient(config.workspace),
		mParticleEventsAPIClient: MParticleClient.createEventsApiClient(
			config.inputPlatform,
			config.pod,
		),
		srs3Client: new SRS3ClientImpl(
			config.sarResultsBucket,
			sarS3BaseKey,
			() => new Date(),
		),
		isProd: stage === 'PROD',
	};
}
