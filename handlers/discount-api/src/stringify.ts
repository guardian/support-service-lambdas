import type { z } from 'zod';

// this is a type safe version of stringify
export const stringify = <T>(t: T, type: z.ZodType<T>): string =>
	JSON.stringify(type.parse(t));
