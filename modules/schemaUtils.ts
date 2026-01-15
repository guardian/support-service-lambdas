import { z } from 'zod';

export const dateFromStringSchema = z.preprocess(
	(input) => (typeof input === 'string' ? new Date(input) : input),
	z.date(),
);

// Defines an optional field, and transforms null to undefined
export const optionalDropNulls = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === null ? undefined : val), schema.optional());
