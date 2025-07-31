import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import type { DataSubjectRequestCallback } from '../../../interfaces/data-subject-request-callback';
import {
	MParticleDataSubjectClient,
	processDataSubjectRequestCallback,
} from '../../apis/data-subject-requests';
import { validateDataSubjectRequestCallback } from '../../utils/validate-data-subject-request-callback';

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
	mParticleDataSubjectClient: MParticleDataSubjectClient,
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
			mParticleDataSubjectClient,
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
