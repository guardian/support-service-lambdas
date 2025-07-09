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

/**
 * A branded string type that represents a GUID (Globally Unique Identifier).
 *
 * This uses TypeScript's branded type pattern to create a nominal type that is
 * structurally a string but distinct from regular strings at compile time.
 *
 * Benefits:
 * - Prevents accidentally passing regular strings where GUIDs are expected
 * - Provides type safety between different kinds of identifiers
 * - Self-documenting code that makes GUID usage explicit
 * - No runtime overhead - compiles to regular strings
 *
 * @example
 * ```typescript
 * // Must explicitly cast or create GUID values
 * const guid = "550e8400-e29b-41d4-a716-446655440000" as GUID;
 *
 * // Or use a helper function
 * function createGUID(value: string): GUID {
 *   return value as GUID;
 * }
 *
 * // This would cause a compile error:
 * const regularString = "hello world";
 * const ref: InitiationReference = regularString; // ❌ Type error
 * ```
 */
export type GUID = string & { readonly __brand: unique symbol };

/**
 * A GUID that uniquely identifies an initiation reference.
 *
 * This branded type ensures that only proper GUID values can be assigned
 * to initiation references, preventing mix-ups with other string values.
 */
export type InitiationReference = GUID;

/**
 * Baton data structures are described here:
 * https://github.com/guardian/baton/blob/1037c63c9bd782aed514bf6aaa38a54dabf699eb/README.md#general-request--response-fields
 */
interface BatonRerEventRequestBase {
	requestType: 'RER';
}

/**
 * Initiate RER data request structure
 * https://github.com/guardian/baton/blob/1037c63c9bd782aed514bf6aaa38a54dabf699eb/README.md#rer-initiate-call
 */
interface BatonRerEventInitiateRequest extends BatonRerEventRequestBase {
	action: 'initiate';
	subjectId: string; // always the identity id
	subjectEmail?: string;
	dataProvider: string;
}

interface BatonRerEventStatusRequest extends BatonRerEventRequestBase {
	action: 'status';
	initiationReference: InitiationReference;
}

export type BatonRerEventRequest =
	| BatonRerEventInitiateRequest
	| BatonRerEventStatusRequest;

interface BatonRerEventResponseBase {
	requestType: 'RER';
	status: 'pending' | 'completed' | 'failed';
	message?: string;
}

/**
 * Initiate RER data response structure
 * https://github.com/guardian/baton/blob/1037c63c9bd782aed514bf6aaa38a54dabf699eb/README.md#rer-response
 */
export interface BatonRerEventInitiateResponse
	extends BatonRerEventResponseBase {
	action: 'initiate';
	initiationReference: InitiationReference;
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

	const dataSubjectRequestSubmissionResponse: DataSubjectRequestSubmission =
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
		initiationReference:
			dataSubjectRequestSubmissionResponse.requestId as InitiationReference,
		message: `Expected completion time: ${dataSubjectRequestSubmissionResponse.expectedCompletionTime.toISOString()}`,
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
