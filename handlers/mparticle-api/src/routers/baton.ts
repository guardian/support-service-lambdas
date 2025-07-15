import { randomUUID } from 'crypto';
import { z } from 'zod';
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
 */
export type GUID = string & { readonly __brand: unique symbol };

/**
 * A GUID that uniquely identifies an initiation reference.
 */
export type InitiationReference = GUID;

// Zod schemas for validation
const InitiationReferenceSchema = z
	.string()
	.uuid()
	.transform((val) => val as InitiationReference);

const BatonRerEventRequestBaseSchema = z.object({
	requestType: z.literal('RER'),
});

const BatonRerEventInitiateRequestSchema =
	BatonRerEventRequestBaseSchema.extend({
		action: z.literal('initiate'),
		subjectId: z.string().min(1, 'Subject Id is required'),
		subjectEmail: z.string().email().optional(),
		dataProvider: z.literal('mparticlerer'),
	});

const BatonRerEventStatusRequestSchema = BatonRerEventRequestBaseSchema.extend({
	action: z.literal('status'),
	initiationReference: InitiationReferenceSchema,
});

export const BatonRerEventRequestSchema = z.discriminatedUnion('action', [
	BatonRerEventInitiateRequestSchema,
	BatonRerEventStatusRequestSchema,
]);

const BatonRerEventResponseBaseSchema = z.object({
	requestType: z.literal('RER'),
	status: z.enum(['pending', 'completed', 'failed']),
	message: z.string().optional(),
});

const BatonRerEventInitiateResponseSchema =
	BatonRerEventResponseBaseSchema.extend({
		action: z.literal('initiate'),
		initiationReference: InitiationReferenceSchema,
	});

const BatonRerEventStatusResponseSchema =
	BatonRerEventResponseBaseSchema.extend({
		action: z.literal('status'),
	});

export const BatonRerEventResponseSchema = z.discriminatedUnion('action', [
	BatonRerEventInitiateResponseSchema,
	BatonRerEventStatusResponseSchema,
]);

// Infer types from schemas
export type BatonRerEventInitiateRequest = z.infer<
	typeof BatonRerEventInitiateRequestSchema
>;
export type BatonRerEventStatusRequest = z.infer<
	typeof BatonRerEventStatusRequestSchema
>;
export type BatonRerEventRequest = z.infer<typeof BatonRerEventRequestSchema>;

export type BatonRerEventInitiateResponse = z.infer<
	typeof BatonRerEventInitiateResponseSchema
>;
export type BatonRerEventStatusResponse = z.infer<
	typeof BatonRerEventStatusResponseSchema
>;
export type BatonRerEventResponse = z.infer<typeof BatonRerEventResponseSchema>;

// Custom validation error class
export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly errors: z.ZodError,
	) {
		super(message);
		this.name = 'ValidationError';
	}
}

// Helper function to validate and parse requests
function validateRequest(data: BatonRerEventRequest): BatonRerEventRequest {
	const result = BatonRerEventRequestSchema.safeParse(data);
	if (!result.success) {
		console.error('Request validation failed:', result.error);
		throw new ValidationError('Invalid request format', result.error);
	}
	return result.data;
}

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
			requestId: randomUUID(),
			requestType: 'erasure',
			submittedTime,
			userId: request.subjectId,
			environment,
		});

	const response: BatonRerEventInitiateResponse = {
		requestType: 'RER' as const,
		action: 'initiate' as const,
		status: 'pending' as const,
		initiationReference:
			dataSubjectRequestSubmissionResponse.requestId as InitiationReference,
		message: `Expected completion time: ${dataSubjectRequestSubmissionResponse.expectedCompletionTime.toISOString()}`,
	};

	return response;
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

	const response: BatonRerEventStatusResponse = {
		requestType: 'RER' as const,
		action: 'status' as const,
		status: mapStatus(dataSubjectRequestState.requestStatus),
	};

	return response;
}

export const batonRerRouter = {
	routeRequest: async (
		event: BatonRerEventRequest,
	): Promise<BatonRerEventResponse> => {
		const validatedEvent = validateRequest(event);
		switch (validatedEvent.action) {
			case 'initiate':
				return handleInitiateRequest(validatedEvent);
			case 'status':
				return handleStatusRequest(validatedEvent);
		}
	},
};
