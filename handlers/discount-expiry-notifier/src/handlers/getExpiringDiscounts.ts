import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/src/bigquery';
import { getIfDefined } from '@modules/nullAndUndefined';
import { stageFromEnvironment } from '@modules/stage';
import { functionalTestQueryResponse } from '../../test/handlers/data/functionalTestQueryResponse';
import { BigQueryResultDataSchema } from '../types';

//to manually run the state machine for a specified discount expiry date, enter {"discountExpiresOnDate":"2025-11-23"} in aws console
export const handler = async (event: { discountExpiresOnDate?: string }) => {
	try {
		const gcpConfig = await getSSMParam(
			`/discount-expiry-notifier/${stageFromEnvironment()}/gcp-credentials-config`,
		);
		const authClient = await buildAuthClient(gcpConfig);

		const discountExpiresOnDate = event.discountExpiresOnDate
			? event.discountExpiresOnDate.substring(0, 10)
			: addDays(new Date(), daysUntilDiscountExpiryDate());

		const result = await runQuery(
			authClient,
			`datatech-platform-${stageFromEnvironment().toLowerCase()}`,
			query(discountExpiresOnDate),
		);
		console.log('result', result);
		const resultData = BigQueryResultDataSchema.parse(result[0]);
		console.log('resultData', resultData);

		const records =
			stageFromEnvironment() === 'PROD'
				? resultData
				: functionalTestQueryResponse;
		return {
			discountExpiresOnDate,
			allRecordsFromBigQueryCount: records.length,
			allRecordsFromBigQuery: records,
		};
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
};

export const addDays = (date: Date, days: number): string => {
	date.setDate(date.getDate() + days);
	return date.toISOString().substring(0, 10);
};

const daysUntilDiscountExpiryDate = (): number => {
	return parseInt(
		getIfDefined<string>(
			process.env.DAYS_UNTIL_DISCOUNT_EXPIRY_DATE,
			'DAYS_UNTIL_DISCOUNT_EXPIRY_DATE environment variable not set',
		),
	);
};

const query = (discountExpiresOnDate: string): string =>
	`
WITH expiringDiscounts AS (
    SELECT
        contact.country as contactCountry,
        contact.first_name as firstName,
        DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) AS firstPaymentDateAfterDiscountExpiry,
        account.account_number as billingAccountId,
        account.currency as paymentCurrency,
        account.sf_contact_id_c as sfContactId,
        contact.work_email as workEmail,
        zuoraSub.id AS zuoraSubId,
        zuoraSub.name AS zuoraSubName,
        sfBuyerContact.mailing_country as sfBuyerContactMailingCountry,
        sfBuyerContact.billing_country as sfBuyerContactOtherCountry,
        sfRecipientContact.mailing_country as sfRecipientContactMailingCountry,
        sfRecipientContact.billing_country as sfRecipientContactOtherCountry,
    FROM 
        datatech-fivetran.zuora.rate_plan_charge charge
    INNER JOIN datatech-fivetran.zuora.rate_plan rate_plan 
        ON rate_plan.id = charge.rate_plan_id
    INNER JOIN datatech-fivetran.zuora.product product 
        ON product.id = charge.product_id
    INNER JOIN datatech-fivetran.zuora.subscription zuoraSub 
        ON zuoraSub.id = charge.subscription_id
    INNER JOIN datatech-fivetran.zuora.contact contact 
        ON contact.id = zuoraSub.sold_to_contact_id
    INNER JOIN datatech-fivetran.zuora.account account 
        ON account.sold_to_contact_id = contact.id
    INNER JOIN datatech-platform-prod.intermediate.stg_salesforce_subscription sfSub 
        ON sfSub.subscription_name = zuoraSub.name
    INNER JOIN datatech-platform-prod.intermediate.stg_salesforce_contact sfBuyerContact 
        ON sfBuyerContact.contact_id = sfSub.buyer
    INNER JOIN datatech-platform-prod.intermediate.stg_salesforce_contact sfRecipientContact 
        ON sfRecipientContact.contact_id = sfSub.recipient
    WHERE 
        product.name = 'Discounts' 
        AND charge.charge_type = 'Recurring' 
        AND charge.up_to_periods IS NOT NULL 
        AND charge.up_to_periods > 1 
        AND zuoraSub.is_latest_version = TRUE 
        AND zuoraSub.status = 'Active' 
		AND DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) = '${discountExpiresOnDate}'
        AND zuoraSub.auto_renew = true
)
SELECT 
    STRING_AGG(DISTINCT billingAccountId) as billingAccountId,
    STRING_AGG(DISTINCT contactCountry) as contactCountry,
    STRING_AGG(DISTINCT firstName) as firstName,
    MIN(exp.firstPaymentDateAfterDiscountExpiry) AS firstPaymentDateAfterDiscountExpiry,
    STRING_AGG(DISTINCT paymentCurrency) as paymentCurrency,
    STRING_AGG(DISTINCT rate_plan_charge.billing_period) AS paymentFrequency,
    STRING_AGG(DISTINCT product.name) as productName,
    STRING_AGG(DISTINCT sfContactId) as sfContactId,
    STRING_AGG(DISTINCT workEmail) as workEmail,
    exp.zuoraSubName as zuoraSubName,
    STRING_AGG(DISTINCT sfBuyerContactMailingCountry) as sfBuyerContactMailingCountry,
    STRING_AGG(DISTINCT sfBuyerContactOtherCountry) as sfBuyerContactOtherCountry,
    STRING_AGG(DISTINCT sfRecipientContactMailingCountry) as sfRecipientContactMailingCountry,
    STRING_AGG(DISTINCT sfRecipientContactOtherCountry) as sfRecipientContactOtherCountry,
FROM
    expiringDiscounts exp
INNER JOIN datatech-fivetran.zuora.rate_plan_charge_tier tier 
    ON tier.subscription_id = exp.zuoraSubId
INNER JOIN datatech-fivetran.zuora.rate_plan_charge rate_plan_charge 
    ON rate_plan_charge.id = tier.rate_plan_charge_id
INNER JOIN datatech-fivetran.zuora.rate_plan rate_plan 
    ON rate_plan.id = rate_plan_charge.rate_plan_id
INNER JOIN datatech-fivetran.zuora.product product 
    ON product.id = rate_plan.product_id
WHERE 
    product.name != 'Discounts'
    AND (rate_plan.amendment_type != 'RemoveProduct' OR rate_plan.amendment_type IS NULL)
GROUP BY 
    exp.zuoraSubName
ORDER BY 
    exp.zuoraSubName DESC
	`;
