import { z } from 'zod';
import type {
	DataSubjectAPI,
	MParticleClient,
} from '../../services/mparticleClient';
import { getStatusOfDataSubjectRequestByUserId } from './getStatusByUserId';
import { dataSubjectRequestFormParser } from '../../routers/http/submit-data-subject-request';

export type DataSubjectRequestForm = z.infer<
	typeof dataSubjectRequestFormParser.body
>;

/**
 * Data Subject Request Submission
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export interface DataSubjectRequestSubmission {
	/**
	 * The estimated time by which the request will be fulfilled, in UTC.
	 */
	expectedCompletionTime: Date;

	/**
	 * The estimated time by which the request was submitted, in UTC.
	 */
	receivedTime: Date;

	/**
	 * The controller-provided identifier of the request in a GUID v4 format.
	 */
	requestId: string;

	/**
	 * A unique ID representing the data controller. mParticles sets this to the workspace ID.
	 */
	controllerId: string;
}

const schema = z.object({
	expected_completion_time: z.string().transform((val) => new Date(val)),
	received_time: z.string().transform((val) => new Date(val)),
	subject_request_id: z.string(),
	controller_id: z.string(),
});

export type PostRequestsResponse = z.infer<typeof schema>;

/**
 * Submit a Data Subject Request (DSR)
 * A request in the OpenDSR format communicates a Data Subject’s wish to access or erase their data.
 * The OpenDSR Request takes a JSON request body and requires a Content-Type: application/json header.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * @param mParticleDataSubjectClient
 * @param {DataSubjectRequestForm} form - The form containing the data subject request details.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const submitDataSubjectRequest = async (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	isProd: boolean,
	form: DataSubjectRequestForm,
): Promise<DataSubjectRequestSubmission> => {
	const requestBody = {
		regulation: form.regulation,
		subject_request_id: form.requestId,
		subject_request_type: form.requestType,
		submitted_time: form.submittedTime,
		subject_identities: {
			controller_customer_id: {
				value: form.userId,
				encoding: 'raw',
			},
		},
		api_version: '3.0',
		status_callback_urls: isProd
			? [
					`https://mparticle-api.support.guardianapis.com/data-subject-requests/${form.requestId}/callback`,
				]
			: [
					`https://mparticle-api-code.support.guardianapis.com/data-subject-requests/${form.requestId}/callback`,
				],
		group_id: form.userId, // Let's group by User Unique Id to group all requests related to that user (max 150 requests per group)
		extensions: {
			'opendsr.mparticle.com': {
				skip_waiting_period: true,
			},
		},
	};

	const response = await mParticleDataSubjectClient.post(
		`/requests`,
		requestBody,
		schema,
	);

	if (!response.success) {
		/**
		 * This can happen when the user retries to submit a request for erasure for the same id.
		 * Let's try to search for an existent request on mParticle before throwing an error.
		 */
		const getDataSubjectRequestResponse =
			await getStatusOfDataSubjectRequestByUserId(
				mParticleDataSubjectClient,
				form.userId,
			);
		if (getDataSubjectRequestResponse) {
			return {
				expectedCompletionTime:
					getDataSubjectRequestResponse.expectedCompletionTime,
				receivedTime: new Date(),
				requestId: getDataSubjectRequestResponse.requestId,
				controllerId: getDataSubjectRequestResponse.controllerId,
			};
		}

		throw response.error;
	}

	return {
		expectedCompletionTime: new Date(response.data.expected_completion_time),
		receivedTime: new Date(response.data.received_time),
		requestId: response.data.subject_request_id,
		controllerId: response.data.controller_id,
	};
};
