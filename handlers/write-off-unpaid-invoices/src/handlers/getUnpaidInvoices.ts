import { uploadFileToS3 } from '@modules/aws/s3';
import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/src/bigquery';

export const handler = async ({ filePath }: { filePath: string }) => {
	const gcpConfig = await getSSMParam(
		process.env.GCP_CREDENTIALS_CONFIG_PARAMETER_NAME!,
	);

	const authClient = await buildAuthClient(gcpConfig);

	const result = await runQuery(authClient, process.env.GCP_PROJECT_ID!, query);

	console.log(result[0].slice(0, 1));

	const s3UploadAttempt = await uploadFileToS3({
		bucketName: process.env.BUCKET_NAME!,
		filePath,
		content: JSON.stringify(result[0].slice(0, 2)),
	});

	if (s3UploadAttempt.$metadata.httpStatusCode !== 200) {
		throw new Error('Failed to upload to S3');
	}
};

const query = `
  WITH cancellations AS 
 (SELECT 
    ame.id AS amendment_id,
    ame.type AS amendment_type,
    ame.name AS amendment_name,
    ame.description as amendment_description,
    ame.subscription_id AS orig_sub_id,
    orig_sub.version AS orig_version,
    orig_sub.name AS orig_sub_number,
    new_sub.id AS new_sub_id,
    new_sub.version AS new_version,
    new_sub.name AS new_sub_number,
    new_sub.cancellation_reason_c,
    new_sub.cancel_reason,
    CASE 
      WHEN new_sub.cancellation_reason_c = 'System AutoCancel' THEN 'Autocancel'
      WHEN new_sub.cancellation_reason_c = 'Customer' THEN 'MMA'
      ELSE 'Salesforce' END as cancellation_source
  FROM datatech-fivetran.zuora.amendment ame
  LEFT JOIN datatech-fivetran.zuora.subscription orig_sub ON ame.subscription_id = orig_sub.id
  LEFT JOIN datatech-fivetran.zuora.subscription new_sub ON (new_sub.name = orig_sub.name AND new_sub.version = orig_sub.version + 1)
  WHERE
    ame.type = "Cancellation"
    AND DATE(ame.created_date) >= DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY)
    AND DATE(ame.created_date) <= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)
 )
,

all_canc_invs AS (
  SELECT
    inv.invoice_number,
    MAX(inv.id) as invoice_id,
    MAX(inv.invoice_date) as invoice_date,
    STRING_AGG(distinct sub_versions.name) as sub_number,
    MAX(sub_versions.version) as sub_version,
    STRING_AGG(distinct canc.cancellation_source) as cancel_source,
    MAX(inv.balance) as invoice_balance
  FROM cancellations canc
  LEFT JOIN datatech-fivetran.zuora.subscription sub_versions ON sub_versions.name = canc.orig_sub_number
  LEFT JOIN datatech-fivetran.zuora.invoice_item item ON item.subscription_id = sub_versions.id
  LEFT JOIN datatech-fivetran.zuora.invoice inv ON item.invoice_id = inv.id
  WHERE inv.balance <> 0
  GROUP BY inv.invoice_number
)

SELECT
  inv.id AS invoice_id,
  MAX(inv.invoice_number) AS invoice_number,
  MAX(inv.amount) AS invoice_amount,
  MAX(inv.balance) AS invoice_balance,
  MAX(inv.currency) AS invoice_currency,
  MAX(inv.invoice_date) AS invoice_date,
  MAX(acc.id) AS account_id,
  MAX(con.country) AS contact_sold_to_country,
  STRING_AGG(DISTINCT prpg.product_code_c) AS product_rate_plan_charge_product_codes,
  STRING_AGG(DISTINCT prp.analysis_code_c) AS product_rate_plan_analysis_codes,
  STRING_AGG(DISTINCT acc_code.project_c) AS accounting_code_project_codes,
  STRING_AGG(DISTINCT CONCAT(item.charge_amount, '!!!', item.id, '!!!', item.sku, '!!!', item.tax_amount, '!!!', COALESCE(tax_item.id, 'NULL'))) AS invoice_items_data,
  MAX(canc_inv.cancel_source) as cancel_source,
  MAX(canc_inv.sub_number) as sub_number,
  MAX(canc_inv.sub_version) as sub_version
FROM datatech-fivetran.zuora.invoice inv
JOIN all_canc_invs canc_inv ON inv.id = canc_inv.invoice_id
LEFT JOIN datatech-fivetran.zuora.invoice_item item ON item.invoice_id = inv.id
LEFT OUTER JOIN datatech-fivetran.zuora.taxation_item tax_item ON item.id = tax_item.invoice_item_id
LEFT JOIN datatech-fivetran.zuora.account acc ON inv.account_id = acc.id
LEFT JOIN datatech-fivetran.zuora.contact con ON acc.sold_to_contact_id = con.id
LEFT JOIN datatech-fivetran.zuora.product_rate_plan prp ON item.product_rate_plan_id = prp.id
LEFT JOIN datatech-fivetran.zuora.product_rate_plan_charge prpg ON item.product_rate_plan_charge_id = prpg.id
LEFT JOIN datatech-fivetran.zuora.accounting_code acc_code ON prpg.recognized_revenue_accounting_code_id = acc_code.id
GROUP BY inv.id
`;
