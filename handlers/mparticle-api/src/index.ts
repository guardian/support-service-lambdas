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
import { AppConfig, getAppConfig, getEnv } from './services/config';
import { MParticleClient } from './services/mparticleClient';
import { BatonS3WriterImpl } from './services/batonS3Writer';
import { Logger } from '@modules/routing/logger';

export const handlerHttp: Handler<
	APIGatewayProxyEvent,
	APIGatewayProxyResult
> = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const { mParticleDataSubjectClient, batonS3Writer, logger } =
			await services();
		console.debug('Processing HTTP request');
		return httpRouter(mParticleDataSubjectClient, batonS3Writer, logger)(event);
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
			logger,
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
	const logger = new Logger();
	logger.log('Starting lambda');
	const stage = getEnv('STAGE');
	const config: AppConfig = await getAppConfig();
	return {
		mParticleDataSubjectClient: MParticleClient(
			logger,
		).createMParticleDataSubjectClient(config.workspace),
		mParticleEventsAPIClient: MParticleClient(logger).createEventsApiClient(
			config.inputPlatform,
			config.pod,
		),
		batonS3Writer: new BatonS3WriterImpl(
			config.sarResultsBucket,
			sarS3BaseKey,
			logger,
		),
		isProd: stage === 'PROD',
		logger,
	};
}
