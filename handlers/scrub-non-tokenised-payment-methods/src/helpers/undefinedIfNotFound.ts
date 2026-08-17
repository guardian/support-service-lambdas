import { isNotFoundInZuora } from './isNotFoundInZuora';

/**
 * Turns a Zuora not-found into undefined so the caller can skip, and rethrows
 * everything else.
 */
export const undefinedIfNotFound = (error: unknown): undefined => {
	if (isNotFoundInZuora(error)) {
		return undefined;
	}
	throw error;
};
