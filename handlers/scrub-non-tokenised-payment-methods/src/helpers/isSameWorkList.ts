import type { PaymentMethodToScrub } from '../types';

/**
 * Whether two runs were handed exactly the same payment methods.
 *
 * Order is not significant, only the set of ids, so a change in how the query
 * sorts does not read as a difference.
 */
export const isSameWorkList = (
	a: PaymentMethodToScrub[],
	b: PaymentMethodToScrub[],
): boolean => {
	if (a.length !== b.length) {
		return false;
	}

	const idsInA = new Set(a.map((item) => item.payment_method_id));

	return b.every((item) => idsInA.has(item.payment_method_id));
};
