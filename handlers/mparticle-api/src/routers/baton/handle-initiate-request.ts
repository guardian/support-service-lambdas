import { randomUUID } from 'crypto';
import type { DataSubjectRequestSubmission } from '../../../interfaces/data-subject-request-submission';
import {
	MParticleDataSubjectClient,
	submitDataSubjectRequest,
} from '../../apis/data-subject-requests';
import {
	MParticleEventsClient,
	setUserAttributesForRightToErasureRequest,
} from '../../apis/events';
import type {
	BatonRerEventInitiateRequest,
	BatonRerEventInitiateResponse,
	InitiationReference,
} from './types-and-schemas';

export async function handleInitiateRequest(
	mParticleDataSubjectClient: MParticleDataSubjectClient,
	mParticleEventsClient: MParticleEventsClient,
	httpRouterBaseUrl: string,
	request: BatonRerEventInitiateRequest,
	isProd: boolean,
): Promise<BatonRerEventInitiateResponse> {
	const submittedTime = new Date().toISOString();
	const environment = isProd ? 'production' : 'development';

	/**
	 * If you wish to remove users from audiences or from event forwarding during the waiting period,
	 * set a user attribute and apply audience criteria and/or forwarding rules to exclude them.
	 * https://docs.mparticle.com/guides/data-subject-requests/#erasure-request-waiting-period
	 */
	try {
		await setUserAttributesForRightToErasureRequest(
			mParticleEventsClient,
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
		await submitDataSubjectRequest(
			mParticleDataSubjectClient,
			httpRouterBaseUrl,
			{
				regulation: 'gdpr',
				requestId: randomUUID(),
				requestType: 'erasure',
				submittedTime,
				userId: request.subjectId,
				environment,
			},
		);

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
