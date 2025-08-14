import {
	DataSubjectAPI,
	MParticleClient,
} from '../../../services/mparticleClient';
import {
	DataSubjectRequestState,
	DataSubjectRequestStatus,
	getStatusOfDataSubjectRequest,
} from '../../../apis/dataSubjectRequests/getStatus';
import { z } from 'zod';
import {
	BatonRerEventRequestBaseSchema,
	BatonRerEventResponseBaseSchema,
} from './schema';
import { InitiationReferenceSchema } from '../initiationReference';

export const BatonRerEventStatusRequestSchema =
	BatonRerEventRequestBaseSchema.extend({
		action: z.literal('status'),
		initiationReference: InitiationReferenceSchema,
	});
export const BatonRerEventStatusResponseSchema =
	BatonRerEventResponseBaseSchema.extend({
		action: z.literal('status'),
	});
export type BatonRerEventStatusRequest = z.infer<
	typeof BatonRerEventStatusRequestSchema
>;
export type BatonRerEventStatusResponse = z.infer<
	typeof BatonRerEventStatusResponseSchema
>;

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
