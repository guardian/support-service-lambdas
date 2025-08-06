import type { DataSubjectRequestState } from '../../../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../../../interfaces/data-subject-request-state';
import { getStatusOfDataSubjectRequest } from '../../apis/data-subject-requests';
import type {
	BatonSarEventStatusRequest,
	BatonSarEventStatusResponse,
} from './types-and-schemas';
import { streamHttpToS3 } from '@modules/aws/s3';

export class HandleSarStatus {
	constructor(
		private sarResultsBucket: string,
		private sarS3BaseKey: string,
		private now: () => Date,
	) {}

	mapStatus = (
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

	fetchToS3 = async (
		httpSourceUrl: string,
		reference: string,
	): Promise<string> => {
		// include date for uniqueness and reference to aid debugging.
		const fileName = this.now().toISOString() + '-' + reference + '.zip';
		const s3Key = this.sarS3BaseKey + fileName;

		await streamHttpToS3(httpSourceUrl, this.sarResultsBucket, s3Key);
		return s3Key;
	};

	public handleSarStatus = async (request: BatonSarEventStatusRequest) => {
		const dataSubjectRequestState: DataSubjectRequestState =
			await getStatusOfDataSubjectRequest(request.initiationReference);

		const resultLocations = dataSubjectRequestState.resultsUrl
			? [
					await (async (resultsUrl: string) => {
						const s3Key = await this.fetchToS3(
							resultsUrl,
							request.initiationReference,
						);
						return `s3://${this.sarResultsBucket}/${s3Key}`;
					})(dataSubjectRequestState.resultsUrl),
				]
			: undefined;

		const response: BatonSarEventStatusResponse = {
			requestType: 'SAR' as const,
			action: 'status' as const,
			status: this.mapStatus(dataSubjectRequestState.requestStatus),
			message: `mParticle Request Id: "${dataSubjectRequestState.requestId}". Expected completion time: ${dataSubjectRequestState.expectedCompletionTime.toISOString()}.`,
			resultLocations,
		};

		return response;
	};
}
