import type { ZodType } from 'zod';
import { z } from 'zod';

export const dateFromStringSchema = z.preprocess(
	(input) => (typeof input === 'string' ? new Date(input) : input),
	z.date(),
);

// Defines an optional field, and transforms null to undefined. This is preferable to `nullish` as it does not pollute the code with `null | undefined`
export const optionalDropNulls = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === null ? undefined : val), schema.optional());

export const parseOrUndefined = <T extends ZodType>(
	schema: T,
	value: unknown,
): z.infer<T> | undefined => {
	const parseResult = schema.safeParse(value);
	if (!parseResult.success) {
		return undefined;
	}
	return parseResult.data;
};
