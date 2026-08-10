import { CANCELLED_SUBSCRIPTION_STATUS } from '../constants';
import { isInTheFuture } from '../helpers';
import type { SubscriptionStatus } from '../types';

/**
 * The one definition, in TypeScript, of an account still being billed.
 *
 * Returns undefined when the account is finished, or what is still billing when
 * it is not, so the caller can say why it skipped.
 *
 * The three clauses below are the same three the BigQuery query uses to build
 * the work list: at least one subscription, all of them cancelled, none of them
 * still in term. That query cannot call this function, so the rule does exist
 * twice, once here and once as SQL in PAYMENT_METHODS_TO_SCRUB_QUERY. Change one
 * and you have to change the other.
 */
export const stillBillingReason = (
	subscriptions: SubscriptionStatus[],
): string | undefined => {
	if (subscriptions.length === 0) {
		return 'no subscriptions';
	}

	const notCancelled = subscriptions.filter(
		(sub) => sub.status !== CANCELLED_SUBSCRIPTION_STATUS,
	);
	if (notCancelled.length > 0) {
		return `${notCancelled.length} subscription(s) that are not cancelled`;
	}

	/*
	 * Cancelled is not the same as finished. A cancellation can be dated to the
	 * end of the term, which leaves the subscription cancelled while payments are
	 * still due, so the card has to stay until the term is actually over.
	 */
	const stillInTerm = subscriptions.filter((sub) =>
		isInTheFuture(sub.termEndDate),
	);
	if (stillInTerm.length > 0) {
		return `${stillInTerm.length} cancelled subscription(s) whose term has not ended yet`;
	}

	return undefined;
};
