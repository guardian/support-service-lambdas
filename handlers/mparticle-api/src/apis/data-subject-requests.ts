import type { DataSubjectRequestCallback } from '../../interfaces/data-subject-request-callback';
import type { DataSubjectRequestForm } from '../../interfaces/data-subject-request-form';
import type { DataSubjectRequestState } from '../../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../../interfaces/data-subject-request-state';
import type { DataSubjectRequestSubmission } from '../../interfaces/data-subject-request-submission';
import { AppConfig } from '../utils/config';
import { makeHttpRequest } from '../utils/make-http-request';
import type { HttpResponse } from '../utils/make-http-request';
import { z } from 'zod';
import { callbackPath, placeholder } from '../routers/http';

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

export class MParticleDataSubjectClient {
	static create(
		workspaceConfig: AppConfig['workspace'],
	): MParticleDataSubjectClient {
		/**
		 * Authentication
		 * The DSR API is secured via basic authentication. Credentials are issued at the level of an mParticle workspace.
		 * You can obtain credentials for your workspace from the Workspace Settings screen. Note that this authentication
		 * is for a single workspace and scopes the DSR to this workspace only.
		 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#authentication
		 */
		const authHeader = `Basic ${Buffer.from(`${workspaceConfig.key}:${workspaceConfig.secret}`).toString('base64')}`;
		return new MParticleDataSubjectClient(authHeader);
	}
	constructor(private authHeader: string) {}

	public async get<RESP>(
		path: string,
		schema: z.ZodType<RESP, z.ZodTypeDef, unknown>,
	): Promise<HttpResponse<RESP>> {
		return await this.fetch(path, 'GET', schema);
	}

	public async post<REQ, RESP>(
		path: string,
		body: REQ,
		schema: z.ZodType<RESP, z.ZodTypeDef, unknown>,
	): Promise<HttpResponse<RESP>> {
		return await this.fetch(path, 'POST', schema, body);
	}

	public async fetch<REQ, RESP>(
		path: string,
		method: 'GET' | 'POST',
		schema: z.ZodType<RESP, z.ZodTypeDef, unknown>,
		body?: REQ,
	): Promise<HttpResponse<RESP>> {
		return makeHttpRequest<RESP>(path, {
			method,
			schema,
			baseURL: `https://opendsr.mparticle.com/v3`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: this.authHeader,
			},
			body: body,
		});
	}
}

/**
 * Submit a Data Subject Request (DSR)
 * A request in the OpenDSR format communicates a Data Subject’s wish to access or erase their data.
 * The OpenDSR Request takes a JSON request body and requires a Content-Type: application/json header.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * @param mParticleDataSubjectClient
 * @param httpRouterBaseUrl the base url to the http router in this lambda for callbacks
 * @param {DataSubjectRequestForm} form - The form containing the data subject request details.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const submitDataSubjectRequest = async (
	mParticleDataSubjectClient: MParticleDataSubjectClient,
	httpRouterBaseUrl: string,
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
		status_callback_urls: [
			httpRouterBaseUrl + callbackPath.replace(placeholder, form.requestId),
		],
		group_id: form.userId, // Let's group by User Unique Id to group all requests related to that user (max 150 requests per group)
		extensions: {
			'opendsr.mparticle.com': {
				skip_waiting_period: true,
			},
		},
	};

	const schema = z.object({
		expected_completion_time: z.string().transform((val) => new Date(val)),
		received_time: z.string().transform((val) => new Date(val)),
		encoded_request: z.string(),
		subject_request_id: z.string(),
		controller_id: z.string(),
	});

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

const getRequestsResponseSchema = z.object({
	controller_id: z.string(),
	expected_completion_time: z.string().transform((val) => new Date(val)),
	subject_request_id: z.string(),
	group_id: z.string().nullable(),
	request_status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
	api_version: z.string(),
	results_url: z.string().nullable(),
	extensions: z
		.record(
			z.object({
				domain: z.string(),
				name: z.string(),
				status: z.enum(['pending', 'skipped', 'sent', 'failed']),
				status_message: z.string(),
			}),
		)
		.nullable(),
});

/**
 * Get the status of an OpenDSR request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} requestId - The ID of the request to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
export const getStatusOfDataSubjectRequest = async (
	mParticleDataSubjectClient: MParticleDataSubjectClient,
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

/**
 * Get the status of an OpenDSR request by User Id
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} userId - The ID of the user to get requests to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body-1
 */
export const getStatusOfDataSubjectRequestByUserId = async (
	mParticleDataSubjectClient: MParticleDataSubjectClient,
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
