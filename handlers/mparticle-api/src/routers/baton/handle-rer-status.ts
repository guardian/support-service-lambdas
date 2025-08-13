import type { DataSubjectRequestState } from '../../../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../../../interfaces/data-subject-request-state';
import { getStatusOfDataSubjectRequest } from '../../apis/data-subject-requests';
import type {
	BatonRerEventStatusRequest,
	BatonRerEventStatusResponse,
} from './types-and-schemas';
import { DataSubjectAPI, MParticleClient } from '../../apis/mparticleClient';

export async function handleRerStatus(
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	request: BatonRerEventStatusRequest,
): Promise<BatonRerEventStatusResponse> {
	const mapStatus = (
		requestStatus: DataSubjectRequestStatus,
	): 'pending' | 'completed' | 'failed' => {
		switch (requestStatus) {
			case DataSubjectRequestStatus.Pending:
			case DataSubjectRequestStatus.InProgress:
				return 'pending';
			case DataSubjectRequestStatus.Completed:
			case DataSubjectRequestStatus.Cancelled:
				return 'completed';
			default:
				return 'failed';
		}
	};

	const dataSubjectRequestState: DataSubjectRequestState =
		await getStatusOfDataSubjectRequest(
			mParticleDataSubjectClient,
			request.initiationReference,
		);

	const response: BatonRerEventStatusResponse = {
		requestType: 'RER' as const,
		action: 'status' as const,
		status: mapStatus(dataSubjectRequestState.requestStatus),
		message: `mParticle Request Id: "${dataSubjectRequestState.requestId}". Expected completion time: ${dataSubjectRequestState.expectedCompletionTime.toISOString()}.`,
	};

	return response;
}
