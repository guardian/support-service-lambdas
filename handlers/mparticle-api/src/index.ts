import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { httpRouter } from './routers/http';
import {
	BatonEventRequest,
	BatonEventResponse,
	batonRerRouter,
} from './routers/baton';
import { ConfigSchema } from './services/config';
import { MParticleClient } from './services/mparticleClient';
import { BatonS3WriterImpl } from './services/batonS3Writer';
import { logger } from '@modules/routing/logger';
import { loadLazyConfig, whoAmI } from '@modules/aws/appConfig';

// only load config on a cold start
const config = whoAmI.then(loadLazyConfig(ConfigSchema));

export const handlerHttp: Handler<
	APIGatewayProxyEvent,
	APIGatewayProxyResult
> = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const { mParticleDataSubjectClient, batonS3Writer } = await services();
		console.debug('Processing HTTP request');
		return httpRouter(mParticleDataSubjectClient, batonS3Writer)(event);
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
			batonS3Writer,
			isProd,
		} = await services();
		const router = batonRerRouter(
			mParticleDataSubjectClient,
			mParticleEventsAPIClient,
			isProd,
			batonS3Writer,
		);
		return logger.wrapRouter(router.routeRequest, 'handlerBaton')(event);
	} catch (error) {
		console.error('Baton handler error:', error);
		throw error;
	}
};

async function services() {
	logger.log('Starting lambda');
	const allConfig = await config.get();
	const stage = allConfig.stage;
	const appConfig = await allConfig.appConfig.get();
	return {
		mParticleDataSubjectClient:
			MParticleClient.createMParticleDataSubjectClient(appConfig.workspace),
		mParticleEventsAPIClient: MParticleClient.createEventsApiClient(
			appConfig.inputPlatform,
			appConfig.pod,
		),
		batonS3Writer: new BatonS3WriterImpl(
			appConfig.sarResultsBucket,
			sarS3BaseKey,
		),
		isProd: stage === 'PROD',
	};
}
