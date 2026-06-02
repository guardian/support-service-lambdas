import { logger } from '@modules/logger/logger';
import type {
	AddSupporterRatePlanItemToQueueState,
	FetchResultsState,
} from '../lambdas/types';
import { toIsoLocalDateTimeUtc } from './dateTimeService';
import type { BatchQueryResponse } from './zuoraQuerierService';

export type FetchResultsDependencies = {
	getResults: (jobId: string) => Promise<BatchQueryResponse>;
	getResultFileResponse: (fileId: string) => Promise<Response>;
	uploadToS3: (
		filename: string,
		body: Uint8Array,
		length: number,
	) => Promise<void>;
	putLastSuccessfulQueryTime: (time: string) => Promise<void>;
};

const getValueOrThrow = <T>(value: T | undefined, errorMessage: string): T => {
	if (value === undefined) {
		throw new Error(errorMessage);
	}
	return value;
};

export const fetchResults = async (
	event: FetchResultsState,
	dependencies: FetchResultsDependencies,
): Promise<AddSupporterRatePlanItemToQueueState> => {
	logger.log('Attempting to fetch results', {
		jobId: event.jobId,
		attemptedQueryTime: event.attemptedQueryTime,
	});

	const result = await dependencies.getResults(event.jobId);

	logger.log('Received job status from Zuora', {
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

	logger.log('Batch details', {
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

	logger.log('Downloading result file from Zuora', { fileId, filename });

	const fileResponse = await dependencies.getResultFileResponse(fileId);
	if (!fileResponse.ok) {
		throw new Error(
			`File download for job with id ${event.jobId} failed with http code ${fileResponse.status}`,
		);
	}

	const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
	const contentLength = fileBytes.byteLength;

	logger.log('Downloaded result file', { filename, contentLength });

	if (contentLength <= 0) {
		throw new Error(
			`Content length of the file for job with id ${event.jobId} is not > 0`,
		);
	}

	logger.log('Uploading result file to S3', {
		filename,
		contentLength,
	});

	await dependencies.uploadToS3(filename, fileBytes, contentLength);

	if (batch.recordCount === 0) {
		logger.log('Record count is 0, updating lastSuccessfulQueryTime', {
			attemptedQueryTime: event.attemptedQueryTime,
		});
		await dependencies.putLastSuccessfulQueryTime(event.attemptedQueryTime);
	}

	logger.log('Successfully wrote file to S3', {
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
