import { randomUUID } from 'crypto';
import type { DataSubjectRequestSubmission } from '../../../interfaces/data-subject-request-submission';
import { submitDataSubjectRequest } from '../../apis/data-subject-requests';
import { setUserAttributesForRightToErasureRequest } from '../../apis/events';
import { getEnv } from '../../utils/config';
import type {
	BatonSarEventInitiateRequest,
	BatonSarEventInitiateResponse,
	InitiationReference,
} from './types-and-schemas';

export async function handleSarInitiate(
	request: BatonSarEventInitiateRequest,
): Promise<BatonSarEventInitiateResponse> {
	const submittedTime = new Date().toISOString();
	const environment = getEnv('STAGE') === 'PROD' ? 'production' : 'development';

	/**
	 * If you wish to remove users from audiences or from event forwarding during the waiting period,
	 * set a user attribute and apply audience criteria and/or forwarding rules to exclude them.
	 * https://docs.mparticle.com/guides/data-subject-requests/#erasure-request-waiting-period
	 */
	try {
		await setUserAttributesForRightToErasureRequest(
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
		await submitDataSubjectRequest({
			regulation: 'gdpr',
			requestId: randomUUID(),
			requestType: 'erasure',
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
