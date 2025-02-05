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
	try {
		const result = await runQuery(authClient, query);
		console.log('result', result);
	} catch (error) {
		//throw error here in prod. just catch error for now in dev
		console.log('error', JSON.stringify(error, null, 2));
	}
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
		contact.country as contactCountry,
		contact.first_name as firstName,
		account.identity_id_c as identityId,
		DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) AS nextPaymentDate,
		account.currency as paymentCurrency,
		account.sf_contact_id_c as sfContactId,
		contact.work_email as workEmail,
		zuoraSub.id AS zuoraSubId,
		zuoraSub.name AS zuoraSubName,
		sfBuyerContact.mailing_country as sfBuyerContactMailingCountry,
		sfBuyerContact.other_country as sfBuyerContactOtherCountry,
		sfRecipientContact.mailing_country as sfRecipientContactMailingCountry,
		sfRecipientContact.other_country as sfRecipientContactOtherCountry,
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
	INNER JOIN datatech-fivetran.salesforce.sf_subscription_c sfSub 
		ON sfSub.name = zuoraSub.name
	INNER JOIN datatech-fivetran.salesforce.contact sfBuyerContact 
		ON sfBuyerContact.id = sfSub.buyer_c
	INNER JOIN datatech-fivetran.salesforce.contact sfRecipientContact 
		ON sfRecipientContact.id = sfSub.recipient_c
	WHERE 
		product.name = 'Discounts' 
		AND charge.charge_type = 'Recurring' 
		AND charge.up_to_periods IS NOT NULL 
		AND charge.up_to_periods > 1 
		AND zuoraSub.is_latest_version = TRUE 
		AND zuoraSub.status = 'Active'
		AND DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) = '${discountExpiresOnDate}' 
		LIMIT 2
)
SELECT 
	STRING_AGG(DISTINCT contactCountry) as contactCountry,
	STRING_AGG(DISTINCT firstName) as firstName,
	STRING_AGG(DISTINCT identityId) as identityId,
	MIN(exp.nextPaymentDate) AS nextPaymentDate,
	SUM(tier.price) AS paymentAmount,
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
INNER JOIN datatech-fivetran.zuora.product product 
	ON product.id = rate_plan_charge.product_id
WHERE 
	product.name != 'Discounts'
GROUP BY 
	exp.zuoraSubName
ORDER BY 
	exp.zuoraSubName DESC;
	`;
