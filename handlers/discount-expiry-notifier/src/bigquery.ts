import { BigQuery } from '@google-cloud/bigquery';
import type {
	BaseExternalAccountClient,
	ExternalAccountClientOptions,
} from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';
import { z } from 'zod';

export const buildAuthClient = async (
	clientConfig: string,
): Promise<BaseExternalAccountClient> => {
	try {
		const parsedConfig = JSON.parse(
			clientConfig,
		) as ExternalAccountClientOptions;
		const authClient = ExternalAccountClient.fromJSON(parsedConfig);

		if (!authClient) {
			throw new Error('Failed to create Google Auth Client');
		}

		return await Promise.resolve(authClient);
	} catch (error) {
		throw new Error(`Error building auth client: ${(error as Error).message}`);
	}
};

export const BigQueryResultDataSchema = z.array(
	z.object({
		firstName: z.string(),
		nextPaymentDate: z
			.object({
				value: z.string(),
			})
			.transform((obj) => obj.value),
		paymentAmount: z.number().transform((val) => parseFloat(val.toFixed(2))),
		paymentCurrency: z.string(),
		paymentFrequency: z.string(),
		productName: z.string(),
		sfContactId: z.string(),
		subName: z.string(),
		workEmail: z.string(),
	}),
);

type DevReturnValueType = Array<{
	firstName: string;
	nextPaymentDate: string;
	paymentAmount: number;
	paymentCurrency: string;
	paymentFrequency: string;
	productName: string;
	sfContactId: string;
	subName: string;
	workEmail: string;
}>;

export const runQuery = async (
	authClient: BaseExternalAccountClient,
): Promise<DevReturnValueType> => {
	const bigquery = new BigQuery({
		projectId: `datatech-platform-code`,
		authClient,
	});

	const executionDate = new Date();
	executionDate.setDate(executionDate.getDate() + 32);

	const executionDateString = executionDate.toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'

	const query = `
		WITH expiringDiscounts AS (
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
				DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) = DATE_ADD(DATE '${executionDateString}', INTERVAL 32 DAY) AND
				sub.name = 'A-S02284587'	
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

	const result = await bigquery.query(query);
	console.log('result', result);

	const resultData = BigQueryResultDataSchema.parse(result[0]);
	console.log('resultData', resultData);

	const devReturnValue = [
		{
			firstName: 'David',
			nextPaymentDate: '2025-02-28',
			paymentAmount: 12,
			paymentCurrency: 'GBP',
			paymentFrequency: 'Month',
			productName: 'Supporter Plus',
			sfContactId: '222',
			subName: 'A-S00814342', // Active sub in dev sandbox
			workEmail: 'david.pepper@guardian.co.uk',
		},
	];
	return devReturnValue;
};
