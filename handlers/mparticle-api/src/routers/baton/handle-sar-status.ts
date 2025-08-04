import type { DataSubjectRequestState } from '../../../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../../../interfaces/data-subject-request-state';
import { getStatusOfDataSubjectRequest } from '../../apis/data-subject-requests';
import type {
	BatonSarEventStatusRequest,
	BatonSarEventStatusResponse,
} from './types-and-schemas';

export async function handleSarStatus(
	request: BatonSarEventStatusRequest,
): Promise<BatonSarEventStatusResponse> {
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
		await getStatusOfDataSubjectRequest(request.initiationReference);

	const response: BatonSarEventStatusResponse = {
		requestType: 'SAR' as const,
		action: 'status' as const,
		status: mapStatus(dataSubjectRequestState.requestStatus),
		message: `mParticle Request Id: "${dataSubjectRequestState.requestId}". Expected completion time: ${dataSubjectRequestState.expectedCompletionTime.toISOString()}.`,
		resultLocations: dataSubjectRequestState.resultsUrl
			? [dataSubjectRequestState.resultsUrl]
			: undefined,
	};

	return response;
}
