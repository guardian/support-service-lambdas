import { logger } from '@modules/routing/logger';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
	SQSEvent,
	SQSRecord,
} from 'aws-lambda';
import type { BatonEventRequest, BatonEventResponse } from './routers/baton';
import { batonRerRouter } from './routers/baton';
import { httpRouter } from './routers/http';
import { BatonS3WriterImpl } from './services/batonS3Writer';
import { BrazeClient } from './services/brazeClient';
import { processUserDeletion } from './apis/dataSubjectRequests/deleteUser';
import {
	DeletionRequestBodySchema,
	parseMessageAttributes,
} from './types/deletionMessage';
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

/**
 * Handler for SQS events from the MMA user deletion queue
 * Processes deletion requests and sends to Braze and mParticle
 */
export const handlerDeletion: Handler<SQSEvent, void> = async (
	event: SQSEvent,
): Promise<void> => {
	try {
		logger.log(`Processing ${event.Records.length} deletion messages`);

		const config: AppConfig = await getAppConfig();
		const mParticleClient =
			MParticleClient.createMParticleDataSubjectClient(config.workspace);
		const brazeClient = new BrazeClient(config.braze.apiUrl, config.braze.apiKey);

		// Process each record independently
		// SQS will retry failed messages automatically
		for (const record of event.Records) {
			await processSQSRecord(record, mParticleClient, brazeClient, config);
		}

		logger.log('Finished processing deletion messages');
	} catch (error) {
		logger.error('Deletion handler error:', error);
		throw error;
	}
};

/**
 * Process a single SQS record
 */
async function processSQSRecord(
	record: SQSRecord,
	mParticleClient: MParticleClient,
	brazeClient: BrazeClient,
	config: AppConfig,
): Promise<void> {
	try {
		logger.log(`Processing message ${record.messageId}`);

		// Parse the message body
		const body = DeletionRequestBodySchema.parse(JSON.parse(record.body));

		// Parse message attributes to track deletion status
		const attributes = parseMessageAttributes(record.messageAttributes);

		logger.log(
			`Deletion request for user ${body.userId}. Attributes:`,
			attributes,
		);

		// Process the deletion
		const result = await processUserDeletion(
			body,
			attributes,
			mParticleClient,
			brazeClient,
			config.mmaUserDeletionDlqUrl,
		);

		if (result.allSucceeded) {
			logger.log(
				`Successfully processed deletion for user ${body.userId}. Message ${record.messageId} will be deleted from queue.`,
			);
		} else {
			logger.log(
				`Partial success for user ${body.userId}. Message sent to DLQ for retry. mParticle=${result.mParticleDeleted}, Braze=${result.brazeDeleted}`,
			);
		}
	} catch (error) {
		logger.error(
			`Error processing message ${record.messageId}. Will be retried by SQS.`,
			error,
		);
		// Re-throw to let SQS handle retry logic
		throw error;
	}
}

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
