import { getIfDefined } from '@modules/nullAndUndefined';
import { stageFromEnvironment } from '@modules/stage';
import { buildAuthClient, runQuery } from '../bigquery';
import { getSSMParam } from '../ssm';
import { testQueryResponse } from '../testQueryResponse';

//to manually run the state machine for a specified discount expiry date, enter {"discountExpiresOnDate":"2025-11-23"} in aws console
export const handler = async (event: { discountExpiresOnDate?: string }) => {
	const gcpConfig = await getSSMParam(
		'gcp-credentials-config',
		stageFromEnvironment(),
	);

	const authClient = await buildAuthClient(gcpConfig);
	const discountExpiresOnDate = event.discountExpiresOnDate
		? event.discountExpiresOnDate.substring(0, 10)
		: addDays(new Date(), daysUntilDiscountExpiryDate());

	const query = getQuery(discountExpiresOnDate);
	const result = await runQuery(authClient, query);
	console.log('result', result);
	return {
		discountExpiresOnDate,
		expiringDiscountsToProcess: testQueryResponse,
	};
};

const addDays = (date: Date, days: number): string => {
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

const getQuery = (discountExpiresOnDate: string): string =>
	`WITH expiringDiscounts AS (
		SELECT
			account.currency as paymentCurrency,
			account.sf_contact_id_c as sfContactId,
			DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) AS calculated_end_date,
			contact.first_name as firstName,
			contact.id AS contactId,
			contact.personal_email as personalEmail,
			contact.work_email as workEmail,
			sub.id AS subId,
			sub.name AS subName
		FROM 
			datatech-fivetran.zuora.rate_plan_charge charge
		INNER JOIN datatech-fivetran.zuora.rate_plan rate_plan 
			ON rate_plan.id = charge.rate_plan_id
		INNER JOIN datatech-fivetran.zuora.product product 
			ON product.id = charge.product_id
		INNER JOIN datatech-fivetran.zuora.subscription sub 
			ON sub.id = charge.subscription_id
		INNER JOIN datatech-fivetran.zuora.contact contact 
			ON contact.id = sub.sold_to_contact_id
		INNER JOIN datatech-fivetran.zuora.account account 
			ON account.sold_to_contact_id = contact.id
		WHERE 
			product.name = 'Discounts' AND 
			charge.charge_type = 'Recurring' AND 
			charge.up_to_periods IS NOT NULL AND 
			charge.up_to_periods > 1 AND 
			sub.is_latest_version = TRUE AND 
			sub.status = 'Active' AND 
			DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) = '${discountExpiresOnDate}' AND
			sub.name = 'xxxxx'	
	)
	SELECT 
		STRING_AGG(DISTINCT firstName) as firstName,
		MIN(exp.calculated_end_date) AS nextPaymentDate,
		SUM(tier.price) AS paymentAmount,
		STRING_AGG(DISTINCT paymentCurrency) as paymentCurrency,
		STRING_AGG(DISTINCT rate_plan_charge.billing_period) AS paymentFrequency,
		STRING_AGG(DISTINCT product.name) as productName,
		STRING_AGG(DISTINCT sfContactId) as sfContactId,
		exp.subName as subName,
		STRING_AGG(DISTINCT workEmail) as workEmail,
	FROM
		expiringDiscounts exp
	INNER JOIN datatech-fivetran.zuora.rate_plan_charge_tier tier 
		ON tier.subscription_id = exp.subId
	INNER JOIN datatech-fivetran.zuora.rate_plan_charge rate_plan_charge 
		ON rate_plan_charge.id = tier.rate_plan_charge_id
	INNER JOIN datatech-fivetran.zuora.product product 
		ON product.id = rate_plan_charge.product_id
	WHERE 
		product.name != 'Discounts'
	GROUP BY 
		exp.subName
	ORDER BY 
		exp.subName DESC;
	`;
