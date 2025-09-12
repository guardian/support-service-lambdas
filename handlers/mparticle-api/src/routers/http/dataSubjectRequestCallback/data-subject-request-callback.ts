import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { validateDataSubjectRequestCallback } from './validate-data-subject-request-callback';
import {
	DataSubjectAPI,
	MParticleClient,
} from '../../../services/mparticleClient';
import type { BatonS3Writer } from '../../../services/batonS3Writer';
import { Logger } from '@modules/routing/logger';

export type DataSubjectRequestCallback = z.infer<
	typeof dataSubjectRequestCallbackParser.body
>;

export const dataSubjectRequestCallbackParser = {
	path: z.object({
		requestId: z.string().uuid(),
	}),
	body: z.object({
		controller_id: z.string(),
		expected_completion_time: z.string().datetime(),
		subject_request_id: z.string().uuid(),
		request_status: z.enum([
			'pending',
			'in_progress',
			'completed',
			'cancelled',
		]),
		api_version: z.string().nullable().optional(),
		results_url: z.string().url().nullable(),
		extensions: z
			.record(
				z.object({
					domain: z.string(),
					name: z.string(),
					status: z.enum(['pending', 'skipped', 'sent', 'failed']),
					status_message: z.string(),
				}),
			)
			.nullable(),
		group_id: z.string().nullable().optional(),
	}),
};

export function dataSubjectRequestCallbackHandler(
	dataSubjectAPIMParticleClient: MParticleClient<DataSubjectAPI>,
	batonS3Writer: BatonS3Writer,
) {
	return async (
		logger: Logger,
		event: APIGatewayProxyEvent,
		parsed: { path: { requestId: string }; body: DataSubjectRequestCallback },
	): Promise<APIGatewayProxyResult> => {
		const getHeader = (key: string): string | undefined =>
			Object.entries(event.headers).find(
				([k]) => k.toLowerCase() === key.toLowerCase(),
			)?.[1];
		const callbackValidationResult = await validateDataSubjectRequestCallback(
			dataSubjectAPIMParticleClient,
			getHeader('x-opendsr-processor-domain'),
			getHeader('x-opendsr-signature'),
			event.body,
		);
		if (!callbackValidationResult) {
			return {
				statusCode: 401,
				body: 'Data Subject Request Callback validation failed.',
			};
		}

		return {
			statusCode: 202,
			body: JSON.stringify(
				await processDataSubjectRequestCallback(
					parsed.path.requestId,
					parsed.body,
					dataSubjectAPIMParticleClient,
					batonS3Writer,
				),
			),
		};
	};
}

/**
 * Callback post made on completion of the Data Subject Request (DSR) by mParticle
 * When a request changes status, including when a request is first created, mParticle sends a callback
 * POST to all URLs specified in the status_callback_urls array of the request. Callbacks are queued
 * and sent every 15 minutes.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 * @param {string} requestId - The ID of the request to check the status of.
 * @param {DataSubjectRequestCallback} payload - The data containing the data subject request state details.
 * @param {MParticleClient<DataSubjectAPI>} dataSubjectAPIMParticleClient - The mParticle client for data subject requests.
 * @param {BatonS3Writer} batonS3Writer - The S3 writer for downloading and storing SAR results.
 * @returns Confirmation message and timestamp
 */
export const processDataSubjectRequestCallback = async (
	requestId: string,
	payload: DataSubjectRequestCallback,
	dataSubjectAPIMParticleClient: MParticleClient<DataSubjectAPI>,
	batonS3Writer: BatonS3Writer,
): Promise<{
	message: string;
	timestamp: Date;
	downloadResult?: string;
}> => {
	// Just log this information so we can have track of it on Cloud Watch
	console.info('Process Data Subject Request Callback from mParticle', {
		requestId,
		form: payload,
	});

	// If the request is completed and has a results_url, download the file
	if (payload.request_status === 'completed' && payload.results_url) {
		try {
			console.info('Downloading SAR results file for completed request', {
				requestId,
				resultsUrl: payload.results_url,
			});

			// Check if file already exists to avoid redundant downloads
			const existingFile = await batonS3Writer.getUrlIfExists(requestId);
			if (existingFile) {
				console.info('File already exists, skipping download', {
					requestId,
					existingFile,
				});
				return {
					message: 'Callback accepted and processed - file already exists',
					timestamp: new Date(),
					downloadResult: existingFile,
				};
			}

			// Extract the path from the results URL
			// Since we have a full url here, we need to strip off the base URL
			const stripBaseUrl = (fullUrl: string, baseUrl: string): string => {
				if (!fullUrl.startsWith(baseUrl)) {
					throw new Error(`URL ${fullUrl} does not start with base ${baseUrl}`);
				}
				return fullUrl.substring(baseUrl.length);
			};

			const path = stripBaseUrl(
				payload.results_url,
				dataSubjectAPIMParticleClient.baseURL,
			);

			// Download the file from mParticle
			const stream = await dataSubjectAPIMParticleClient.getStream(path);

			// Save to S3
			const s3Url = await batonS3Writer.write(requestId, stream);
			console.info('Successfully downloaded and saved SAR results file', {
				requestId,
				s3Url,
			});

			return {
				message: 'Callback accepted and processed - file downloaded',
				timestamp: new Date(),
				downloadResult: s3Url,
			};
		} catch (error) {
			console.error('Error downloading SAR results file', {
				requestId,
				error,
			});
			return {
				message: 'Callback accepted but file download failed',
				timestamp: new Date(),
			};
		}
	}

	return {
		message: 'Callback accepted and processed',
		timestamp: new Date(),
	};
};
