import { uploadFileToS3 } from '@modules/aws/s3';
import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/bigquery';

export const handler = async ({ filePath }: { filePath: string }) => {
	const gcpConfig = await getSSMParam(
		process.env.GCP_CREDENTIALS_CONFIG_PARAMETER_NAME!,
	);

	const authClient = await buildAuthClient(gcpConfig);

	const [jsonContent] = await runQuery(
		authClient,
		process.env.GCP_PROJECT_ID!,
		query,
	);

	console.log(
		`Found ${Array.isArray(jsonContent) ? jsonContent.length : 0} payment methods to scrub`,
	);

	await uploadFileToS3({
		bucketName: process.env.BUCKET_NAME!,
		filePath,
		content: JSON.stringify(jsonContent),
	});
};

/*
 * The daily cap is deliberate. There is a historical backlog of roughly twenty
 * thousand of these payment methods going back to 2015, and an ongoing trickle
 * of a handful a month. Capping each run means the same code drains the backlog
 * over a few weeks and then handles the trickle, with no separate backfill job
 * and no risk of hitting Zuora's rate limit. Oldest first, so the run order is
 * stable and progress is easy to follow.
 *
 * Subscriptions are versioned in Zuora, so an account is only fully cancelled
 * when every one of its latest-version subscriptions is Cancelled. An account
 * with no subscriptions at all is excluded, since it never had one to cancel.
 */
const query = `
    WITH fully_cancelled_accounts AS (
        SELECT sub.account_id
        FROM datatech-fivetran.zuora.subscription sub
        WHERE sub.is_latest_version
        AND NOT sub._fivetran_deleted
        GROUP BY sub.account_id
        HAVING COUNT(*) > 0
        AND COUNTIF(sub.status != 'Cancelled') = 0
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
    AND pm.payment_method_status = 'Active'
    AND NOT pm._fivetran_deleted
    ORDER BY pm.created_date ASC
    LIMIT 500
`;
