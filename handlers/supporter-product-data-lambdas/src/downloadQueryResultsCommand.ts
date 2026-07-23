import { createWriteStream, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { logger } from '@modules/logger/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { queryZuora } from './handlers/queryZuora';
import type { QueryType } from './handlers/types';
import { ConfigService } from './services/configService';
import { getExcludedProductRatePlanIds } from './services/excludedRatePlans';
import {
	type BatchQueryResponse,
	ZuoraQuerierService,
} from './services/zuoraQuerierService';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves the file path to write results to. If `outputPath` is an existing
 * directory (e.g. `./`) the default filename is appended, otherwise the path is
 * treated as the target file.
 */
export const resolveOutputFilePath = (
	outputPath: string,
	defaultFilename: string,
): string => {
	const isDirectory =
		outputPath.endsWith('/') ||
		(existsSync(outputPath) && statSync(outputPath).isDirectory());
	return isDirectory ? join(outputPath, defaultFilename) : outputPath;
};

/**
 * Polls Zuora for the status of a batch query job until it either completes or
 * fails. Throws if the job aborts/errors or if it doesn't complete within the
 * allotted number of attempts.
 */
const waitForCompletion = async (
	getResults: (jobId: string) => Promise<BatchQueryResponse>,
	jobId: string,
	{ maxAttempts = 60, pollIntervalMs = 10_000 } = {},
): Promise<BatchQueryResponse> => {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const result = await getResults(jobId);
		logger.log('Polled Zuora job status', {
			jobId,
			status: result.status,
			attempt,
		});

		if (result.status === 'completed') {
			return result;
		}

		if (result.status === 'aborted' || result.status === 'error') {
			throw new Error(`Job ${jobId} finished with status ${result.status}`);
		}

		await sleep(pollIntervalMs);
	}

	throw new Error(
		`Job ${jobId} did not complete within ${maxAttempts} attempts`,
	);
};

/**
 * Streams the result file for a completed batch query job to a local file.
 */
const downloadResultFileToLocal = async (
	service: ZuoraQuerierService,
	result: BatchQueryResponse,
	outputPath: string,
): Promise<void> => {
	const batch = getIfDefined(
		result.batches[0],
		`No batches were returned for job ${result.id}`,
	);
	const fileId = getIfDefined(
		batch.fileId,
		`batch.fileId was missing for job ${result.id}`,
	);

	logger.log('Downloading result file from Zuora', {
		fileId,
		recordCount: batch.recordCount,
		outputPath,
	});

	const fileResponse = await service.getResultFileResponse(fileId);
	if (!fileResponse.ok) {
		throw new Error(
			`File download for job ${result.id} failed with http code ${fileResponse.status}`,
		);
	}
	if (!fileResponse.body) {
		throw new Error(`Response body was null for job ${result.id}`);
	}

	await pipeline(
		Readable.fromWeb(fileResponse.body),
		createWriteStream(outputPath),
	);

	logger.log('Successfully wrote result file', {
		outputPath,
		recordCount: batch.recordCount,
	});
};

/**
 * Submits the select-active-rate-plans query to Zuora, waits for it to
 * complete, and downloads the CSV results to a local file. Returns the resolved
 * path the results were written to.
 */
export const downloadQueryResults = async (
	stage: Stage,
	queryType: QueryType,
	outputPath: string,
): Promise<string> => {
	const configService = new ConfigService(stage);
	const zuoraClient = await ZuoraClient.create(stage);
	const service = new ZuoraQuerierService(zuoraClient);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);

	const { jobId } = await queryZuora(queryType, {
		partnerId: await configService.getPartnerId(),
		getLastSuccessfulQueryTime: () =>
			configService.getLastSuccessfulQueryTime(),
		excludedProductRatePlanIds: getExcludedProductRatePlanIds(zuoraCatalog),
		postQuery: (request) => service.postQuery(request),
	});

	const completed = await waitForCompletion(
		(id) => service.getResults(id),
		jobId,
	);

	const resolvedPath = resolveOutputFilePath(
		outputPath,
		`select-active-rate-plans-${stage}-${Date.now()}.csv`,
	);

	await downloadResultFileToLocal(service, completed, resolvedPath);

	return resolvedPath;
};

void (async function () {
	// Only run the CLI when this file is executed directly (not when imported by
	// tests), so importing the helpers doesn't trigger the command.
	if (!process.argv[1]?.includes('downloadQueryResultsCommand')) {
		return;
	}

	const stage = process.argv[2];
	if (stage !== 'CODE' && stage !== 'PROD') {
		console.log(
			'Usage: pnpm download-query-results <STAGE> <full|incremental> [outputPath]',
		);
		console.log('  STAGE must be CODE or PROD');
		return;
	}

	const queryType = process.argv[3] ?? 'full';
	if (queryType !== 'full' && queryType !== 'incremental') {
		console.log("queryType must be either 'full' or 'incremental'");
		return;
	}

	// The downloaded file contains PII, so default to the OS temp directory
	// rather than the current working directory. This keeps it out of the git
	// working tree (avoiding accidental commits) and lets the OS clean it up
	// automatically. Pass an explicit outputPath to override.
	let outputPath = process.argv[4];
	if (outputPath === undefined) {
		console.log(`Defaulting outputPath to the OS temp directory: ${tmpdir()}`);
		outputPath = tmpdir();
	}

	const resolvedPath = await downloadQueryResults(stage, queryType, outputPath);
	console.log(`Results written to ${resolvedPath}`);
	console.log(
		'This file contains PII - delete it when you are done and never commit it to source control.',
	);
})();
