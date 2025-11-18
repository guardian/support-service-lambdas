import { logger } from '@modules/routing/logger';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import type { BatonEventRequest, BatonEventResponse } from './routers/baton';
import { batonRerRouter } from './routers/baton';
import { httpRouter } from './routers/http';
import { BatonS3WriterImpl } from './services/batonS3Writer';
import type { AppConfig } from './services/config';
import { getAppConfig, getEnv } from './services/config';
import { MParticleClient } from './services/mparticleClient';

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
	const stage = getEnv('STAGE');
	const config: AppConfig = await getAppConfig();
	return {
		mParticleDataSubjectClient:
			MParticleClient.createMParticleDataSubjectClient(config.workspace),
		mParticleEventsAPIClient: MParticleClient.createEventsApiClient(
			config.inputPlatform,
			config.pod,
		),
		batonS3Writer: new BatonS3WriterImpl(config.sarResultsBucket, sarS3BaseKey),
		isProd: stage === 'PROD',
	};
}
