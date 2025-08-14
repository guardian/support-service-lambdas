import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import type { DataSubjectRequestForm } from '../../../interfaces/data-subject-request-form';
import { submitDataSubjectRequest } from '../../apis/data-subject-requests';
import { setUserAttributesForRightToErasureRequest } from '../../apis/events';
import {
	DataSubjectAPI,
	EventsAPI,
	MParticleClient,
} from '../../apis/mparticleClient';

export const dataSubjectRequestFormParser = {
	body: z.object({
		regulation: z.enum(['gdpr', 'ccpa']),
		requestId: z.string().uuid(),
		requestType: z.enum(['access', 'portability', 'erasure']),
		submittedTime: z.string().datetime(),
		userId: z.string(),
		environment: z.enum(['production', 'development']),
	}),
};

export function submitDataSubjectRequestHandler(
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
	isProd: boolean,
) {
	return async (
		event: APIGatewayProxyEvent,
		parsed: { path: unknown; body: DataSubjectRequestForm },
	): Promise<APIGatewayProxyResult> => {
		/**
		 * If you wish to remove users from audiences or from event forwarding during the waiting period,
		 * set a user attribute and apply audience criteria and/or forwarding rules to exclude them.
		 * https://docs.mparticle.com/guides/data-subject-requests/#erasure-request-waiting-period
		 */
		try {
			// FIXME only set for erasure (not SAR?)
			await setUserAttributesForRightToErasureRequest(
				mParticleEventsAPIClient,
				parsed.body.environment,
				parsed.body.userId,
				parsed.body.submittedTime,
			);
		} catch (error) {
			console.warn(
				'It was not possible to set the User Attribute to remove user from audiences or from event forwarding during the waiting period.',
				error,
			);
		}

		return {
			statusCode: 201,
			body: JSON.stringify(
				await submitDataSubjectRequest(
					mParticleDataSubjectClient,
					isProd,
					parsed.body,
				),
			),
		};
	};
}
