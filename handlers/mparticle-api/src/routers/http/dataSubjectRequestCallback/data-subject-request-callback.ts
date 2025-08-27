import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { validateDataSubjectRequestCallback } from './validate-data-subject-request-callback';
import {
	DataSubjectAPI,
	MParticleClient,
} from '../../../services/mparticleClient';

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
) {
	return async (
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
				processDataSubjectRequestCallback(parsed.path.requestId, parsed.body),
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
 * @returns Confirmation message and timestamp
 */
export const processDataSubjectRequestCallback = (
	requestId: string,
	payload: DataSubjectRequestCallback,
): {
	message: string;
	timestamp: Date;
} => {
	// Just log this information so we can have track of it on Cloud Watch
	console.info('Process Data Subject Request Callback from mParticle', {
		requestId,
		form: payload,
	});

	return {
		message: 'Callback accepted and processed',
		timestamp: new Date(),
	};
};
