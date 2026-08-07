import type { Stage } from '@modules/stage';

/** The app name, which every resource this lambda owns is named after. */
export const APP = 'scrub-non-tokenised-payment-methods';

/** The Riff-Raff stack, which also forms part of the config path in SSM. */
export const STACK = 'support';

/** Where the first handler writes the work list for the distributed map. */
export const bucketName = (stage: Stage) => `${APP}-${stage.toLowerCase()}`;

/** The GCP project the Fivetran mirror of Zuora lives in. */
export const gcpProjectId = (stage: Stage) =>
	`datatech-platform-${stage.toLowerCase()}`;

/**
 * Zuora answers with this code when the thing you asked for is not there.
 * Used to tell a stale work list apart from a real failure.
 */
export const ZUORA_ENTITY_NOT_FOUND_CODE = '50000040';

/** The only payment method status we act on. */
export const ACTIVE_PAYMENT_METHOD_STATUS = 'Active';

/** The subscription status every subscription on the account must have. */
export const CANCELLED_SUBSCRIPTION_STATUS = 'Cancelled';

/**
 * How many payment methods a single run will look at.
 *
 * There is a backlog of around twenty thousand going back to 2015 and an
 * ongoing trickle of a couple of dozen a month, because cards are still being
 * entered in Zuora directly. Capping each run means the same code drains the
 * backlog over about six weeks and then handles the trickle, with no separate
 * backfill job.
 *
 * Not a Zuora limit: Zuora caps requests in flight, not requests per day, and
 * the map runs one at a time. The cap is what keeps a run short enough to finish
 * inside the state machine's timeout.
 */
export const DAILY_SCRUB_LIMIT = 500;

/**
 * Finds non-tokenised cards on accounts that are done being billed.
 *
 * Oldest first, so the run order is stable and progress is easy to follow.
 *
 * Cancelled is not the same as finished. A cancellation can be dated to the end
 * of the term, which leaves the subscription cancelled while payments are still
 * due, so the term has to be over as well. There are currently 147 such accounts
 * that status alone would have picked up.
 *
 * Subscriptions are versioned in Zuora and only the latest version carries a
 * live status, every earlier one is Expired, so without that filter no account
 * would ever qualify. An account with no subscriptions at all is excluded, since
 * it never had one to cancel.
 *
 * The three HAVING clauses are the same rule stillBillingReason applies when
 * each item is re-read from Zuora. SQL cannot call it, so the rule genuinely
 * lives in two places: change one and you have to change the other.
 */
export const PAYMENT_METHODS_TO_SCRUB_QUERY = `
    WITH fully_cancelled_accounts AS (
        SELECT sub.account_id
        FROM datatech-fivetran.zuora.subscription sub
        WHERE sub.is_latest_version
        AND NOT sub._fivetran_deleted
        GROUP BY sub.account_id
        HAVING COUNT(*) > 0
        AND COUNTIF(sub.status != '${CANCELLED_SUBSCRIPTION_STATUS}') = 0
        AND COUNTIF(sub.term_end_date > CURRENT_DATE()) = 0
    )

    SELECT
        pm.id AS payment_method_id,
        pm.account_id,
        acc.account_number
    FROM datatech-fivetran.zuora.payment_method pm
    JOIN fully_cancelled_accounts fca
        ON fca.account_id = pm.account_id
    JOIN datatech-fivetran.zuora.account acc
        ON acc.id = pm.account_id
        AND NOT acc._fivetran_deleted
    WHERE pm.type = 'CreditCard'
    AND pm.payment_method_status = '${ACTIVE_PAYMENT_METHOD_STATUS}'
    AND NOT pm._fivetran_deleted
    ORDER BY pm.created_date ASC
    LIMIT ${DAILY_SCRUB_LIMIT}
`;
