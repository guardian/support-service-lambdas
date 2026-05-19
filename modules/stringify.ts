import type { z } from 'zod';

/**
 * This is a type safe version of stringify
 * @param t
 * @param type
 */
export const stringify = <T>(t: T, type: z.ZodType<T>): string =>
	JSON.stringify(type.parse(t));
