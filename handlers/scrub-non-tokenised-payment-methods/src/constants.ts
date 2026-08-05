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
 * ongoing trickle of a handful a month. Capping each run means the same code
 * drains the backlog over about six weeks and then handles the trickle, with no
 * separate backfill job, and keeps the run well inside Zuora's rate limit.
 */
export const DAILY_SCRUB_LIMIT = 500;

/**
 * Finds non-tokenised cards on accounts where every subscription is cancelled.
 *
 * Oldest first, so the run order is stable and progress is easy to follow.
 *
 * Subscriptions are versioned in Zuora, so an account is only fully cancelled
 * when every one of its latest-version subscriptions is cancelled. An account
 * with no subscriptions at all is excluded, since it never had one to cancel.
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
