import { ZuoraError } from '@modules/zuora/errors';
import { ZUORA_ENTITY_NOT_FOUND_CODE } from '../constants';

/**
 * Whether Zuora is telling us the thing we asked for is not there.
 *
 * That is not a failure for this job, it is the work list having gone stale:
 * the account was removed between the BigQuery snapshot and the run, so the
 * item no longer qualifies and belongs on the skip path. Treating it as a
 * failure would raise an alarm every time. It is also what every item looks
 * like in CODE, where the work list is full of PROD ids the sandbox has never
 * heard of.
 *
 * Narrow on purpose. Any other Zuora error still fails loudly.
 */
export const isNotFoundInZuora = (error: unknown): boolean =>
	error instanceof ZuoraError &&
	error.zuoraErrorDetails.some(
		(detail) => detail.code === ZUORA_ENTITY_NOT_FOUND_CODE,
	);
