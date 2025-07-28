import { z } from 'zod';

// this prevents us mixing up UUIDs and normal strings at compile time
export type GUID = string & { readonly __brand: unique symbol };
export type InitiationReference = GUID;

// Zod schemas for validation
export const InitiationReferenceSchema = z
	.string()
	.uuid()
	.transform((val) => val as InitiationReference);

const BatonRerEventRequestBaseSchema = z.object({
	requestType: z.literal('RER'),
});

export const BatonRerEventInitiateRequestSchema =
	BatonRerEventRequestBaseSchema.extend({
		action: z.literal('initiate'),
		subjectId: z.string().min(1, 'Subject Id is required'),
		subjectEmail: z.string().email().optional(),
		dataProvider: z.literal('mparticlerer'),
	});

export const BatonRerEventStatusRequestSchema =
	BatonRerEventRequestBaseSchema.extend({
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
	message: z.string(),
});

export const BatonRerEventInitiateResponseSchema =
	BatonRerEventResponseBaseSchema.extend({
		action: z.literal('initiate'),
		initiationReference: InitiationReferenceSchema,
	});

export const BatonRerEventStatusResponseSchema =
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
