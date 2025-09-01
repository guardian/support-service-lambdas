import { z } from 'zod';

export const dateFromStringSchema = z.preprocess(
	(input) => (typeof input === 'string' ? new Date(input) : input),
	z.date(),
);
