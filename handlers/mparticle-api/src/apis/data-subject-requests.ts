import type { DataSubjectRequestCallback } from '../../interfaces/data-subject-request-callback';
import type { DataSubjectRequestForm } from '../../interfaces/data-subject-request-form';
import type { DataSubjectRequestState } from '../../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../../interfaces/data-subject-request-state';
import type { DataSubjectRequestSubmission } from '../../interfaces/data-subject-request-submission';
import { getAppConfig, getEnv } from '../utils/config';
import { makeHttpRequest } from '../utils/make-http-request';
import type { HttpResponse } from '../utils/make-http-request';

function parseDataSubjectRequestStatus(
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

async function requestDataSubjectApi<T>(
	url: string,
	options: {
		method?: 'GET' | 'POST';
		body?: unknown;
	},
): Promise<HttpResponse<T>> {
	const appConfig = await getAppConfig();
	return makeHttpRequest<T>(url, {
		method: options.method,
		baseURL: `https://opendsr.mparticle.com/v3`,
		headers: {
			'Content-Type': 'application/json',
			/**
			 * Authentication
			 * The DSR API is secured via basic authentication. Credentials are issued at the level of an mParticle workspace.
			 * You can obtain credentials for your workspace from the Workspace Settings screen. Note that this authentication
			 * is for a single workspace and scopes the DSR to this workspace only.
			 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#authentication
			 */
			Authorization: `Basic ${Buffer.from(`${appConfig.workspace.key}:${appConfig.workspace.secret}`).toString('base64')}`,
		},
		body: options.body,
	});
}

/**
 * Submit a Data Subject Request (DSR)
 * A request in the OpenDSR format communicates a Data Subject’s wish to access or erase their data.
 * The OpenDSR Request takes a JSON request body and requires a Content-Type: application/json header.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * @param {DataSubjectRequestForm} form - The form containing the data subject request details.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const submitDataSubjectRequest = async (
	form: DataSubjectRequestForm,
): Promise<DataSubjectRequestSubmission> => {
	const response = await requestDataSubjectApi<{
		expected_completion_time: Date;
		received_time: Date;
		encoded_request: string;
		subject_request_id: string;
		controller_id: string;
	}>(`/requests`, {
		method: 'POST',
		body: {
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
			status_callback_urls:
				getEnv('STAGE') === 'PROD'
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
		},
	});

	if (!response.success) {
		/**
		 * This can happen when the user retries to submit a request for erasure for the same id.
		 * Let's try to search for an existent request on mParticle before throwing an error.
		 */
		const getDataSubjectRequestResponse =
			await getStatusOfDataSubjectRequestByUserId(form.userId);
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

/**
 * Get the status of an OpenDSR request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} requestId - The ID of the request to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
export const getStatusOfDataSubjectRequest = async (
	requestId: string,
): Promise<DataSubjectRequestState> => {
	const response = await requestDataSubjectApi<{
		controller_id: string;
		expected_completion_time: Date;
		subject_request_id: string;
		group_id: string | null;
		request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
		api_version: string;
		results_url: string | null;
		extensions: Record<
			string,
			{
				domain: string;
				name: string;
				status: 'pending' | 'skipped' | 'sent' | 'failed';
				status_message: string;
			}
		> | null;
	}>(`/requests/${requestId}`, {
		method: 'GET',
	});

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

/**
 * Get the status of an OpenDSR request by User Id
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} userId - The ID of the user to get requests to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body-1
 */
export const getStatusOfDataSubjectRequestByUserId = async (
	userId: string,
): Promise<DataSubjectRequestState | null> => {
	const response = await requestDataSubjectApi<
		Array<{
			controller_id: string;
			expected_completion_time: Date;
			subject_request_id: string;
			group_id: string | null;
			request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
			api_version: string;
			results_url: string | null;
			extensions: Record<
				string,
				{
					domain: string;
					name: string;
					status: 'pending' | 'skipped' | 'sent' | 'failed';
					status_message: string;
				}
			> | null;
		}>
	>(`/requests?group_id=${userId}`, {
		method: 'GET',
	});

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

/**
 * Callback post made on completion of the Data Subject Request (DSR) by mParticle
 * When a request changes status, including when a request is first created, mParticle sends a callback
 * POST to all URLs specified in the status_callback_urls array of the request. Callbacks are queued
 * and sent every 15 minutes.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 * @param {string} requestId - The ID of the request to check the status of.
 * @param {DataSubjectRequestCallback} payload - The data containing the data subject request state details.
 * @returns Confirmation message and timestamp
 */
export const processDataSubjectRequestCallback = (
	requestId: string,
	payload: DataSubjectRequestCallback,
): {
	message: string;
	timestamp: Date;
} => {
	// Just log this information so we can have track of it on Cloud Watch
	console.info('Process Data Subject Request Callback from mParticle', {
		requestId,
		form: payload,
	});

	return {
		message: 'Callback accepted and processed',
		timestamp: new Date(),
	};
};

export { requestDataSubjectApi };
