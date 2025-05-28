import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { DataSubjectRequestForm } from '../interfaces/data-subject-request-form';
import type { DataSubjectRequestState } from '../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../interfaces/data-subject-request-state';
import type { DataSubjectRequestSubmission } from '../interfaces/data-subject-request-submission';

// #region API Clients

let _dataSubjectRequestApiClient: AxiosInstance | undefined = undefined;
const getDataSubjectRequestApiClient = (): AxiosInstance => {
	if (!_dataSubjectRequestApiClient) {
		_dataSubjectRequestApiClient = axios.create({
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
				'Authorization': `Basic ${Buffer.from(`${process.env.apiKey}:${process.env.apiSecret}`).toString('base64')}`,
			},
		});
	}
	return _dataSubjectRequestApiClient;
}

// #endregion

// #region Tools

const parseDataSubjectRequestStatus = (status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): DataSubjectRequestStatus => {
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

// #endregion

// #region API Interface

/**
 * Submit a Data Subject Request (DSR)
 * A request in the OpenDSR format communicates a Data Subject’s wish to access or erase their data.
 * The OpenDSR Request takes a JSON request body and requires a Content-Type: application/json header.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
const submitDataSubjectRequest = async (form: DataSubjectRequestForm): Promise<DataSubjectRequestSubmission> => {
	try {
		const response = await getDataSubjectRequestApiClient().post<{
			expected_completion_time: Date;
			received_time: Date;
			encoded_request: string;
			subject_request_id: string;
			controller_id: string;
		}>(`/requests`, {
			regulation: form.regulation,
			"subject_request_id": "a7551968-d5d6-44b2-9831-815ac9017798", // <- Should we create this right here or ask to the client for it?
			subject_request_type: form.subjectRequestType,
			submitted_time: form.submittedTime,
			skip_waiting_period: true,
			subject_identities: form.subjectIdentities.map(identity => ({
				identity_type: identity.identityType,
				value: identity.value,
				encoding: identity.encoding,
			})),
			api_version: "3.0",
			"status_callback_urls": [
				"https://exampleurl.com/opendsr/callbacks" // <- We should create an endpoint on this app to receive this status callback and propagate its state. In alternative we can call the BigQuery erasure app.
			],
			"group_id": "my-group", // <- Let's maybe use the User Unique Id to group all requests related to that user (max 150 requests per group)
			extensions: []
		});
		return {
			expectedCompletionTime: new Date(response.data.expected_completion_time),
			receivedTime: new Date(response.data.received_time),
			subjectRequestId: response.data.subject_request_id,
			controllerId: response.data.controller_id,
		};
	} catch (err) {
		console.error('Error submitting Data Subject Request:', err);
		throw err;
	}
};

/**
 * Get the status of an OpenDSR request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} requestId - The ID of the request to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
const getStatusOfDataSubjectRequest = async (requestId: string): Promise<DataSubjectRequestState> => {
	try {
		const response = await getDataSubjectRequestApiClient().get<{
			controller_id: string;
			expected_completion_time: Date;
			subject_request_id: string;
			group_id: string | null;
			request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
			api_version: string;
			results_url: string | null;
			extensions: Array<{
				domain: string;
				name: string;
				status: 'pending' | 'skipped' | 'sent' | 'failed';
				status_message: string;
			}> | null;
		}>(`/requests/${requestId}`);
		return {
			expectedCompletionTime: new Date(response.data.expected_completion_time),
			subjectRequestId: response.data.subject_request_id,
			controllerId: response.data.controller_id,
			requestStatus: parseDataSubjectRequestStatus(response.data.request_status),
			resultsUrl: response.data.results_url,
		};
	} catch (err) {
		console.error(`Error getting status Data Subject Request ${requestId}.`, err);
		throw err;
	}
};

// #endregion

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		const method = event.httpMethod;
		const path = event.path;
		const pathParameters = event.pathParameters ?? {};

		if (method === 'POST' && path === '/requests') {
			let payload: unknown;

			try {
				payload = JSON.parse(event.body ?? '{}');
			} catch {
				return {
					statusCode: 400,
					body: 'Invalid JSON in request body',
				};
			}

			return {
				statusCode: 200,
				body: JSON.stringify(await submitDataSubjectRequest(payload as DataSubjectRequestForm)),
			};
		}

		if (method === 'GET' && path.match(/^\/requests\/[a-zA-Z0-9-]+$/)) {
			const requestId = pathParameters.requestId ?? path.split('/')[2];

			if (!requestId) {
				return {
					statusCode: 400,
					body: 'Missing "requestId" in path'
				};
			}

			return {
				statusCode: 200,
				body: JSON.stringify(await getStatusOfDataSubjectRequest(requestId))
			};
		}

		return {
			statusCode: 404,
			body: 'Not Found',
		};
	} catch (err: unknown) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal Server Error', details: (err as Error).message }),
		};
	}
};
