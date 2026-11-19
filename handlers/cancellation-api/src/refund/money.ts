import { z } from 'zod';

/**
 * Converts an amount in pounds to whole pence, throwing on a fraction of a penny.
 */
export function toPence(amount: number): number {
	const pence = Math.round(amount * 100);
	// allow for floating point noise, e.g. 12.14 * 100 = 1214.0000000000002
	if (Math.abs(amount * 100 - pence) > 1e-6) {
		throw new Error(`${amount} is not a whole number of pence`);
	}
	return pence || 0;
}

export const fromPence = (pence: number): number => pence / 100;

export const penceSchema = z.codec(
	z.number().finite(),
	z.number().int().brand<'Pence'>(),
	{ decode: toPence, encode: fromPence },
);

export type Pence = z.output<typeof penceSchema>;
