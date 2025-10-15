import { randomUUID } from 'crypto';

import {
	DataSubjectAPI,
	MParticleClient,
} from '../../../services/mparticleClient';
import {
	DataSubjectRequestSubmission,
	submitDataSubjectRequest,
} from '../../../apis/dataSubjectRequests/submit';
import { z } from 'zod';
import {
	BatonSarEventRequestBaseSchema,
	BatonSarEventResponseBaseSchema,
} from './schema';
import {
	InitiationReference,
	InitiationReferenceSchema,
} from '../initiationReference';

export const BatonSarEventInitiateRequestSchema =
	BatonSarEventRequestBaseSchema.extend({
		action: z.literal('initiate'),
		subjectId: z.string().min(1, 'Subject Id is required'),
		subjectEmail: z.string().email().optional(),
		dataProvider: z.literal('mparticlesar'),
	});
export const BatonSarEventInitiateResponseSchema =
	BatonSarEventResponseBaseSchema.extend({
		action: z.literal('initiate'),
		initiationReference: InitiationReferenceSchema,
	});
export type BatonSarEventInitiateRequest = z.infer<
	typeof BatonSarEventInitiateRequestSchema
>;
export type BatonSarEventInitiateResponse = z.infer<
	typeof BatonSarEventInitiateResponseSchema
>;

export async function handleSarInitiate(
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	isProd: boolean,
	request: BatonSarEventInitiateRequest,
): Promise<BatonSarEventInitiateResponse> {
	const submittedTime = new Date().toISOString();
	const environment = isProd ? 'production' : 'development';

	const dataSubjectRequestSubmissionResponse: DataSubjectRequestSubmission =
		await submitDataSubjectRequest(mParticleDataSubjectClient, isProd, {
			regulation: 'gdpr',
			requestId: randomUUID(),
			requestType: 'access',
			submittedTime,
			userId: request.subjectId,
			environment,
		});

	const response: BatonSarEventInitiateResponse = {
		requestType: 'SAR' as const,
		action: 'initiate' as const,
		status: 'pending' as const,
		initiationReference:
			dataSubjectRequestSubmissionResponse.requestId as InitiationReference,
		message: `mParticle Request Id: "${dataSubjectRequestSubmissionResponse.requestId}". Expected completion time: ${dataSubjectRequestSubmissionResponse.expectedCompletionTime.toISOString()}.`,
	};

	return response;
}
