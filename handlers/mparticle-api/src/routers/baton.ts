import { v4 as uuidv4 } from 'uuid';
import type { DataSubjectRequestState } from '../../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../../interfaces/data-subject-request-state';
import type { DataSubjectRequestSubmission } from '../../interfaces/data-subject-request-submission';
import {
	getStatusOfDataSubjectRequest,
	submitDataSubjectRequest,
} from '../apis/data-subject-requests';
import { setUserAttributesForRightToErasureRequest } from '../apis/events';
import { getEnv } from '../utils/config';

// https://github.com/guardian/baton/blob/1037c63c9bd782aed514bf6aaa38a54dabf699eb/README.md
interface BatonRerEventRequestBase {
	requestType: 'RER';
}

interface BatonRerEventInitiateRequest extends BatonRerEventRequestBase {
	action: 'initiate';
	subjectId: string;
	subjectEmail?: string;
	dataProvider: 'mparticlerer';
}

interface BatonRerEventStatusRequest extends BatonRerEventRequestBase {
	action: 'status';
	initiationReference: string;
}

export type BatonRerEventRequest =
	| BatonRerEventInitiateRequest
	| BatonRerEventStatusRequest;

interface BatonRerEventResponseBase {
	requestType: 'RER';
	status: 'pending' | 'completed' | 'failed';
	message?: string;
}

export interface BatonRerEventInitiateResponse
	extends BatonRerEventResponseBase {
	action: 'initiate';
	initiationReference: string;
}

export interface BatonRerEventStatusResponse extends BatonRerEventResponseBase {
	action: 'status';
}

export type BatonRerEventResponse =
	| BatonRerEventInitiateResponse
	| BatonRerEventStatusResponse;

async function handleInitiateRequest(
	request: BatonRerEventInitiateRequest,
): Promise<BatonRerEventInitiateResponse> {
	const submittedTime = new Date().toISOString();
	const environment = getEnv('STAGE') === 'PROD' ? 'production' : 'development';

	/**
	 * If you wish to remove users from audiences or from event forwarding during the waiting period,
	 * set a user attribute and apply audience criteria and/or forwarding rules to exclude them.
	 * https://docs.mparticle.com/guides/data-subject-requests/#erasure-request-waiting-period
	 */
	try {
		await setUserAttributesForRightToErasureRequest(
			environment,
			request.subjectId,
			submittedTime,
		);
	} catch (error) {
		console.warn(
			'It was not possible to set the User Attribute to remove user from audiences or from event forwarding during the waiting period.',
			error,
		);
	}

	const dataSubjectRequestSubmission: DataSubjectRequestSubmission =
		await submitDataSubjectRequest({
			regulation: 'gdpr',
			requestId: uuidv4(),
			requestType: 'erasure',
			submittedTime,
			userId: request.subjectId,
			environment,
		});
	return {
		requestType: 'RER',
		action: 'initiate',
		status: 'pending',
		initiationReference: dataSubjectRequestSubmission.requestId,
		message: `Expected completion time: ${dataSubjectRequestSubmission.expectedCompletionTime.toISOString()}`,
	};
}

async function handleStatusRequest(
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
		await getStatusOfDataSubjectRequest(request.initiationReference);
	return {
		requestType: 'RER',
		action: 'status',
		status: mapStatus(dataSubjectRequestState.requestStatus),
	};
}

export const batonRerRouter = {
	routeRequest: async (
		event: BatonRerEventRequest,
	): Promise<BatonRerEventResponse> => {
		switch (event.action) {
			case 'initiate':
				return handleInitiateRequest(event);
			case 'status':
				return handleStatusRequest(event);
		}
	},
};
