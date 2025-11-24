import { z } from 'zod';

// this prevents us mixing up UUIDs and normal strings at compile time
export type GUID = string & { readonly __brand: unique symbol };
export type InitiationReference = GUID;

export const InitiationReferenceSchema = z
	.string()
	.uuid()
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- already checked by serialiser
	.transform((val) => val as InitiationReference);
