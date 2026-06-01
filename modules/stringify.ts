import type { z } from 'zod';

/**
 * This is a type safe version of stringify, it ensures that we only include
 * values which are specified in the schema in the resulting JSON, helping to
 * avoid accidental leakage of sensitive data.
 * @param t
 * @param type
 */
export const stringify = <T>(t: T, type: z.ZodType<T>): string =>
	JSON.stringify(type.parse(t));
