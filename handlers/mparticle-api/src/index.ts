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
import { withLogging } from './utils/withLogging';

export const handlerHttp: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> =
	withLogging(
		async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
			try {
				const { mParticleDataSubjectClient, mParticleEventsAPIClient, batonS3Writer, isProd } =
					await services();
				console.debug('Processing HTTP request');
				return httpRouter(
					mParticleDataSubjectClient,
					mParticleEventsAPIClient,
					batonS3Writer,
					isProd,
				).routeRequest(event);
			} catch (error) {
				console.error('HTTP handler error:', error);
				return {
					statusCode: 500,
					body: JSON.stringify({ error: 'Internal server error' }),
				};
			}
		},
		'handlerHttp',
	);

// this must be the same base key as we have permissions set in the CDK
const sarS3BaseKey = 'mparticle-results/';

export const handlerBaton: Handler<BatonEventRequest, BatonEventResponse> =
	withLogging(async (event: BatonEventRequest): Promise<BatonEventResponse> => {
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
			console.debug('Processing Baton event');
			return router.routeRequest(event);
		} catch (error) {
			console.error('Baton handler error:', error);
			throw error; // Re-throw to trigger Lambda retry mechanism
		}
	}, 'handlerBaton');

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
		batonS3Writer: new BatonS3WriterImpl(
			config.sarResultsBucket,
			sarS3BaseKey,
		),
		isProd: stage === 'PROD',
	};
}
