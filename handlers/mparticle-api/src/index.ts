import { logger } from '@modules/routing/logger';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
	SQSEvent,
	SQSRecord,
} from 'aws-lambda';
import { processUserDeletion } from './apis/dataSubjectRequests/deleteUser';
import type { BatonEventRequest, BatonEventResponse } from './routers/baton';
import { batonRerRouter } from './routers/baton';
import { httpRouter } from './routers/http';
import { BatonS3WriterImpl } from './services/batonS3Writer';
import { BrazeClient } from './services/brazeClient';
import type { AppConfig } from './services/config';
import { getAppConfig, getEnv } from './services/config';
import { MParticleClient } from './services/mparticleClient';
import type {
	BulkDeletionAPI,
	MParticleClient as MParticleClientType,
} from './services/mparticleClient';
import {
	DeletionRequestBodySchema,
	SnsNotificationSchema,
} from './types/deletionMessage';

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

/**
 * Handler for SQS events from the MMA user deletion queue
 * Processes deletion requests and sends to Braze and mParticle
 */
export const handlerDeletion: Handler<SQSEvent, void> = async (
	event: SQSEvent,
): Promise<void> => {
	const recordSummaries = event.Records.map((record, index) => ({
		index,
		messageId: record.messageId,
		attributes: {
			approximateReceiveCount: record.attributes.ApproximateReceiveCount,
			sentTimestamp: record.attributes.SentTimestamp,
		},
	}));
	logger.log('Processing deletion messages', {
		recordCount: event.Records.length,
		records: recordSummaries,
	});

	const {
		mParticleBulkDeletionClient: mParticleClient,
		brazeClient,
		mParticleEnvironment,
	} = await services();

	// there will only be a single record, sqs will retry the batch on error
	for (const record of event.Records) {
		await processSQSRecord(
			record,
			mParticleClient,
			brazeClient,
			mParticleEnvironment,
		);
	}

	logger.log('Finished processing deletion messages');
};

async function processSQSRecord(
	record: SQSRecord,
	mParticleClient: MParticleClientType<BulkDeletionAPI>,
	brazeClient: BrazeClient | undefined,
	mParticleEnvironment: 'production' | 'development',
): Promise<void> {
	logger.log(`Processing message ${record.messageId}`);

	// Parse the SNS notification envelope
	const snsNotification = SnsNotificationSchema.parse(JSON.parse(record.body));

	// Parse the actual deletion request from the Message field
	const body = DeletionRequestBodySchema.parse(
		JSON.parse(snsNotification.Message),
	);

	// Add userId to logger context for correlation
	logger.mutableAddContext(body.userId);

	await processUserDeletion(
		body.userId,
		body.brazeId,
		mParticleClient,
		brazeClient,
		mParticleEnvironment,
	);

	logger.log(
		`Successfully processed deletion for user ${body.userId}. Message ${record.messageId} will be deleted from queue.`,
	);
}

async function services() {
	logger.log('Starting lambda');
	const stage = getEnv('STAGE');
	const config: AppConfig = await getAppConfig();
	const mParticleEnvironment: 'production' | 'development' =
		stage === 'PROD' ? 'production' : 'development';
	return {
		mParticleDataSubjectClient:
			MParticleClient.createMParticleDataSubjectClient(config.workspace),
		mParticleBulkDeletionClient: MParticleClient.createBulkDeletionClient(
			config.workspace,
			config.pod,
		),
		mParticleEventsAPIClient: MParticleClient.createEventsApiClient(
			config.inputPlatform,
			config.pod,
		),
		batonS3Writer: new BatonS3WriterImpl(config.sarResultsBucket, sarS3BaseKey),
		brazeClient: config.braze
			? new BrazeClient(config.braze.apiUrl, config.braze.apiKey)
			: undefined,
		mParticleEnvironment,
		isProd: stage === 'PROD',
	};
}
