import { randomUUID } from 'crypto';

import {
	DataSubjectAPI,
	EventsAPI,
	MParticleClient,
} from '../../../services/mparticleClient';
import { addErasureExclusionAttributes } from '../../shared/addErasureExclusionAttributes';
import {
	DataSubjectRequestSubmission,
	submitDataSubjectRequest,
} from '../../../apis/dataSubjectRequests/submit';
import { z } from 'zod';
import {
	BatonRerEventRequestBaseSchema,
	BatonRerEventResponseBaseSchema,
} from './schema';
import {
	InitiationReference,
	InitiationReferenceSchema,
} from '../initiationReference';

export const BatonRerEventInitiateRequestSchema =
	BatonRerEventRequestBaseSchema.extend({
		action: z.literal('initiate'),
		subjectId: z.string().min(1, 'Subject Id is required'),
		subjectEmail: z.string().email().optional(),
		dataProvider: z.literal('mparticlerer'),
	});
export const BatonRerEventInitiateResponseSchema =
	BatonRerEventResponseBaseSchema.extend({
		action: z.literal('initiate'),
		initiationReference: InitiationReferenceSchema,
	});
// Infer types from schemas
export type BatonRerEventInitiateRequest = z.infer<
	typeof BatonRerEventInitiateRequestSchema
>;
export type BatonRerEventInitiateResponse = z.infer<
	typeof BatonRerEventInitiateResponseSchema
>;

export async function handleRerInitiate(
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
	isProd: boolean,
	request: BatonRerEventInitiateRequest,
): Promise<BatonRerEventInitiateResponse> {
	const submittedTime = new Date().toISOString();
	const environment = isProd ? 'production' : 'development';

	/**
	 * If you wish to remove users from audiences or from event forwarding during the waiting period,
	 * set a user attribute and apply audience criteria and/or forwarding rules to exclude them.
	 * https://docs.mparticle.com/guides/data-subject-requests/#erasure-request-waiting-period
	 */
	try {
		await addErasureExclusionAttributes(
			mParticleEventsAPIClient,
			environment,
			request.subjectId,
			submittedTime,
		);
	} catch (error) {
		console.warn(
			'It was not possible to set the User Attribute to remove user from audiences or from event forwarding during the waiting period.',
			error,
		);
	}

	const dataSubjectRequestSubmissionResponse: DataSubjectRequestSubmission =
		await submitDataSubjectRequest(mParticleDataSubjectClient, isProd, {
			regulation: 'gdpr',
			requestId: randomUUID(),
			requestType: 'erasure',
			submittedTime,
			userId: request.subjectId,
			environment,
		});

	const response: BatonRerEventInitiateResponse = {
		requestType: 'RER' as const,
		action: 'initiate' as const,
		status: 'pending' as const,
		initiationReference:
			dataSubjectRequestSubmissionResponse.requestId as InitiationReference,
		message: `mParticle Request Id: "${dataSubjectRequestSubmissionResponse.requestId}". Expected completion time: ${dataSubjectRequestSubmissionResponse.expectedCompletionTime.toISOString()}.`,
	};

	return response;
}
