import { randomUUID } from 'crypto';
import type { DataSubjectRequestSubmission } from '../../../interfaces/data-subject-request-submission';
import { submitDataSubjectRequest } from '../../apis/data-subject-requests';
import { getEnv } from '../../utils/config';
import type {
	BatonSarEventInitiateRequest,
	BatonSarEventInitiateResponse,
	InitiationReference,
} from './types-and-schemas';
import { DataSubjectAPI, MParticleClient } from '../../apis/mparticleClient';

export async function handleSarInitiate(
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	isProd: boolean,
	request: BatonSarEventInitiateRequest,
): Promise<BatonSarEventInitiateResponse> {
	const submittedTime = new Date().toISOString();
	const environment = getEnv('STAGE') === 'PROD' ? 'production' : 'development';

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
