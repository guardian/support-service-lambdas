import type {
	Handler,
	SQSBatchResponse,
	SQSEvent,
	SQSRecord,
} from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import type { MParticleEnvironment } from '@modules/mparticle/events';
import { uploadEventBatch } from '@modules/mparticle/events';
import { createEventsApiClient } from '@modules/mparticle/mparticleHttpClient';
import { stageFromEnvironment } from '@modules/stage';
import { acquisitionEventSchema } from './acquisitionEvent';
import type {
	AcquisitionEventBatch,
	MParticleMappingConfiguration,
} from './acquisitions';
import { buildMParticleBatch } from './acquisitions';
import { getAppConfig } from './config';

type FailedResult = {
	success: false;
	messageId: string;
};

type SuccessfulResult = {
	success: true;
};

type Result = FailedResult | SuccessfulResult;

export type SendMParticle = (batch: AcquisitionEventBatch) => Promise<void>;

function failureResult(record: SQSRecord): FailedResult {
	return { success: false, messageId: record.messageId };
}

function errorType(error: unknown): string {
	return error instanceof Error ? error.name : typeof error;
}

export async function processRecord(
	record: SQSRecord,
	configuration: MParticleMappingConfiguration,
	environment: MParticleEnvironment,
	send: SendMParticle,
): Promise<Result> {
	let payload: unknown;
	try {
		payload = JSON.parse(record.body);
	} catch {
		logger.error('Failed to parse mParticle acquisition event JSON', {
			messageId: record.messageId,
		});
		return failureResult(record);
	}

	const parsedEvent = acquisitionEventSchema.safeParse(payload);
	if (!parsedEvent.success) {
		logger.error('Failed to validate mParticle acquisition event', {
			messageId: record.messageId,
			validationIssues: parsedEvent.error.issues.map(
				({ path, code, message }) => ({ path, code, message }),
			),
		});
		return failureResult(record);
	}

	try {
		const batch = buildMParticleBatch(
			parsedEvent.data.detail,
			configuration,
			environment,
		);
		await send(batch);
		logger.log('Published mParticle acquisition event', {
			messageId: record.messageId,
			sourceRequestId: batch.source_request_id,
		});
	} catch (error) {
		logger.error('Failed to publish mParticle acquisition event', {
			messageId: record.messageId,
			errorType: errorType(error),
		});
		return failureResult(record);
	}

	return { success: true };
}

export async function processRecords(
	event: SQSEvent,
	configuration: MParticleMappingConfiguration,
	environment: MParticleEnvironment,
	send: SendMParticle,
): Promise<SQSBatchResponse> {
	const results = await Promise.all(
		event.Records.map((record) =>
			processRecord(record, configuration, environment, send),
		),
	);

	return {
		batchItemFailures: results
			.filter((result): result is FailedResult => !result.success)
			.map((result) => ({ itemIdentifier: result.messageId })),
	};
}

export const handler: Handler<SQSEvent, SQSBatchResponse> = async (event) => {
	const stage = stageFromEnvironment();
	const config = await getAppConfig();
	const client = createEventsApiClient(config.mparticle, config.mparticle.pod);
	const environment: MParticleEnvironment =
		stage === 'PROD' ? 'production' : 'development';

	return processRecords(event, config.mparticle, environment, (batch) =>
		uploadEventBatch(client, batch),
	);
};
