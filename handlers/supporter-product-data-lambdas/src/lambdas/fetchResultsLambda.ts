import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Handler } from 'aws-lambda';
import type { BatchQueryResponse } from '../model/zuora';
import { ConfigService } from '../services/configService';
import { toIsoLocalDateTimeUtc } from '../services/dateTimeService';
import { S3Service } from '../services/s3Service';
import { ZuoraQuerierService } from '../services/zuoraQuerierService';
import type {
	AddSupporterRatePlanItemToQueueState,
	FetchResultsState,
} from './types';

interface FetchResultsDeps {
	getResults: (jobId: string) => Promise<BatchQueryResponse>;
	getResultFileResponse: (fileId: string) => Promise<Response>;
	uploadToS3: (
		stage: ReturnType<typeof stageFromEnvironment>,
		filename: string,
		body: Uint8Array,
		length: number,
	) => Promise<void>;
	putLastSuccessfulQueryTime: (time: string) => Promise<void>;
}

const getValueOrThrow = <T>(value: T | undefined, errorMessage: string): T => {
	if (value === undefined) {
		throw new Error(errorMessage);
	}
	return value;
};

const buildDefaultDeps = async (): Promise<FetchResultsDeps> => {
	const stage = stageFromEnvironment();
	const configService = new ConfigService(stage);
	const zuoraClient = await ZuoraClient.create(stage);
	const zuoraService = new ZuoraQuerierService(zuoraClient);
	const s3Service = new S3Service();

	return {
		getResults: (jobId) => zuoraService.getResults(jobId),
		getResultFileResponse: (fileId) =>
			zuoraService.getResultFileResponse(fileId),
		uploadToS3: (uploadStage, filename, body, length) =>
			s3Service.streamToS3(uploadStage, filename, body, length),
		putLastSuccessfulQueryTime: (time) =>
			configService.putLastSuccessfulQueryTime(time),
	};
};

export const fetchResults = async (
	event: FetchResultsState,
	deps?: FetchResultsDeps,
): Promise<AddSupporterRatePlanItemToQueueState> => {
	const stage = stageFromEnvironment();
	const resolvedDeps = deps ?? (await buildDefaultDeps());

	console.info('Attempting to fetch results', {
		jobId: event.jobId,
		attemptedQueryTime: event.attemptedQueryTime,
		stage,
	});

	const result = await resolvedDeps.getResults(event.jobId);

	console.info('Received job status from Zuora', {
		jobId: event.jobId,
		status: result.status,
		batchCount: result.batches.length,
	});

	if (result.status !== 'completed') {
		throw new Error(
			`Job with id ${event.jobId} is still in status ${result.status}`,
		);
	}

	const batch = getValueOrThrow(
		result.batches[0],
		`No batches were returned in the batch query response for jobId ${event.jobId}`,
	);

	console.info('Batch details', {
		jobId: event.jobId,
		fileId: batch.fileId,
		recordCount: batch.recordCount,
		full: batch.full,
	});

	const fileId = getValueOrThrow(
		batch.fileId,
		`Batch.fileId was missing in jobId ${event.jobId}`,
	);

	const filename = `select-active-rate-plans-${toIsoLocalDateTimeUtc(
		event.attemptedQueryTime,
	)}.csv`;

	console.info('Downloading result file from Zuora', { fileId, filename });

	const fileResponse = await resolvedDeps.getResultFileResponse(fileId);
	if (!fileResponse.ok) {
		throw new Error(
			`File download for job with id ${event.jobId} failed with http code ${fileResponse.status}`,
		);
	}

	const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
	const contentLength = fileBytes.byteLength;

	console.info('Downloaded result file', { filename, contentLength });

	if (contentLength <= 0) {
		throw new Error(
			`Content length of the file for job with id ${event.jobId} is not > 0`,
		);
	}

	console.info('Uploading result file to S3', {
		stage,
		filename,
		contentLength,
	});

	await resolvedDeps.uploadToS3(stage, filename, fileBytes, contentLength);

	if (batch.recordCount === 0) {
		console.info('Record count is 0, updating lastSuccessfulQueryTime', {
			attemptedQueryTime: event.attemptedQueryTime,
		});
		await resolvedDeps.putLastSuccessfulQueryTime(event.attemptedQueryTime);
	}

	console.info('Successfully wrote file to S3', {
		filename,
		recordCount: batch.recordCount,
		jobId: event.jobId,
	});

	return {
		filename,
		recordCount: batch.recordCount,
		processedCount: 0,
		attemptedQueryTime: event.attemptedQueryTime,
	};
};

export const handler: Handler<
	FetchResultsState,
	AddSupporterRatePlanItemToQueueState
> = async (event) => fetchResults(event);
