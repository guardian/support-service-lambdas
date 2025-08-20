import { z } from 'zod';
import type {
	DataSubjectAPI,
	MParticleClient,
} from '../../services/mparticleClient';

export enum DataSubjectRequestStatus {
	Pending = 'pending',
	InProgress = 'in-progress',
	Completed = 'completed',
	Cancelled = 'cancelled',
}

/**
 * Get the status of an OpenDSR request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
export interface DataSubjectRequestState {
	/**
	 * The estimated time by which the request will be fulfilled, in UTC.
	 */
	expectedCompletionTime: Date;

	/**
	 * The controller-provided identifier of the request in a GUID v4 format.
	 */
	requestId: string;

	/**
	 * A unique ID representing the data controller. mParticles sets this to the workspace ID.
	 */
	controllerId: string;

	/**
	 * The status of the request.
	 */
	requestStatus: DataSubjectRequestStatus;

	/**
	 * For Access/Portability requests, a download link to the request results data.
	 * This field contains null unless the request is complete. After a request completes,
	 * the resultsUrl is valid for 7 days. After that time, attempting to access this URL
	 * results in a 410 Gone HTTP response. If no records can be found matching the identities
	 * in the request, a request returns a 404 error.
	 */
	resultsUrl: string | null;
}

export const getRequestsResponseSchema = z.object({
	controller_id: z.string(),
	expected_completion_time: z.string().transform((val) => new Date(val)),
	subject_request_id: z.string(),
	request_status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
	results_url: z.string().nullable(),
});

export type GetRequestsResponse = z.infer<typeof getRequestsResponseSchema>;

/**
 * Get the status of an OpenDSR request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} requestId - The ID of the request to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
export const getStatusOfDataSubjectRequest = async (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	requestId: string,
): Promise<DataSubjectRequestState> => {
	const response = await mParticleDataSubjectClient.get(
		`/requests/${requestId}`,
		getRequestsResponseSchema,
	);

	if (!response.success) {
		throw response.error;
	}

	return {
		expectedCompletionTime: new Date(response.data.expected_completion_time),
		requestId: response.data.subject_request_id,
		controllerId: response.data.controller_id,
		requestStatus: parseDataSubjectRequestStatus(response.data.request_status),
		resultsUrl: response.data.results_url,
	};
};

export function parseDataSubjectRequestStatus(
	status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
): DataSubjectRequestStatus {
	switch (status) {
		case 'pending':
			return DataSubjectRequestStatus.Pending;
		case 'in_progress':
			return DataSubjectRequestStatus.InProgress;
		case 'completed':
			return DataSubjectRequestStatus.Completed;
		case 'cancelled':
			return DataSubjectRequestStatus.Cancelled;
	}
}
