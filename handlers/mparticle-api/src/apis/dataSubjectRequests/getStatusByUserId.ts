import type {
	DataSubjectAPI,
	MParticleClient,
} from '../../services/mparticleClient';

import { z } from 'zod';
import {
	DataSubjectRequestState,
	getRequestsResponseSchema,
	parseDataSubjectRequestStatus,
} from './getStatus';

/**
 * Get the status of an OpenDSR request by User Id
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} userId - The ID of the user to get requests to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body-1
 */
export const getStatusOfDataSubjectRequestByUserId = async (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	userId: string,
): Promise<DataSubjectRequestState | null> => {
	const schema = z.array(getRequestsResponseSchema);
	const response = await mParticleDataSubjectClient.get(
		`/requests?group_id=${userId}`,
		schema,
	);

	if (!response.success) {
		throw response.error;
	}

	const data = response.data[0];
	if (!data) {
		return null;
	}

	if (response.data.length > 1) {
		console.warn(
			'Found more than 1 request on Get Status of Data Subject Request by UserId. Only the first one will be used.',
			{
				userId,
				data,
			},
		);
	}

	return {
		expectedCompletionTime: new Date(data.expected_completion_time),
		requestId: data.subject_request_id,
		controllerId: data.controller_id,
		requestStatus: parseDataSubjectRequestStatus(data.request_status),
		resultsUrl: data.results_url,
	};
};
