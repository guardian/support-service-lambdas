import { z } from 'zod';

export const dateFromStringSchema = z.preprocess(
	(input) => (typeof input === 'string' ? new Date(input) : input),
	z.date(),
);

// Defines an optional field, and transforms null to undefined. This is preferable to `nullish` as it does not pollute the code with `null | undefined`
export const optionalDropNulls = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === null ? undefined : val), schema.optional());
