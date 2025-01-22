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
		sub_name: z.string(),
		first_name: z.string(),
		payment_amount: z.number(),
		payment_frequency: z.string(),
		next_payment_date: z.object({
			value: z.string(),
		}),
	}),
);

export const runQuery = async (
	authClient: BaseExternalAccountClient,
): Promise<DevReturnValueType> => {
	const bigquery = new BigQuery({
		projectId: `datatech-platform-code`,
		authClient,
	});

	const query = `
		WITH expiringDiscounts AS (
			SELECT
				DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) AS calculated_end_date,
				sub.name AS sub_name,
				sub.id AS sub_id,
				contact.id AS contact_id
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
			WHERE 
				product.name = 'Discounts' 
				AND charge.charge_type = 'Recurring' 
				AND charge.up_to_periods IS NOT NULL 
				AND charge.up_to_periods > 1 
				AND sub.is_latest_version = TRUE 
				AND sub.status = 'Active' 
				AND DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) = DATE_ADD(CURRENT_DATE(), INTERVAL 32 DAY) 
				AND sub.name IN ('A-S02269182', 'A-S02274098')
		)
		SELECT 
			exp.sub_name,
			STRING_AGG(DISTINCT contact.first_name) AS first_name,
			SUM(tier.price) AS payment_amount,
			STRING_AGG(DISTINCT rate_plan_charge.billing_period) AS payment_frequency,
			MIN(exp.calculated_end_date) AS next_payment_date
		FROM
			expiringDiscounts exp
		INNER JOIN datatech-fivetran.zuora.rate_plan_charge_tier tier 
			ON tier.subscription_id = exp.sub_id
		INNER JOIN datatech-fivetran.zuora.rate_plan_charge rate_plan_charge 
			ON rate_plan_charge.id = tier.rate_plan_charge_id
		INNER JOIN datatech-fivetran.zuora.product product 
			ON product.id = rate_plan_charge.product_id
		INNER JOIN datatech-fivetran.zuora.contact contact 
			ON contact.id = exp.contact_id
		WHERE 
			product.name != 'Discounts'
		GROUP BY 
			exp.sub_name
		ORDER BY 
			exp.sub_name DESC;
		`;

	const result = await bigquery.query(query);
	console.log('result', result);

	const resultData = BigQueryResultDataSchema.parse(result[0]);
	console.log('resultData', resultData);

	const devReturnValue = [
		{
			calculatedEndDate: '2025-02-23',
			subName: 'A-S02274098',
			firstName: 'James',
		},
		{
			calculatedEndDate: '2025-02-23',
			subName: 'A-S02270028',
			firstName: 'Sarah',
		},
	];
	return devReturnValue;
};

type DevReturnValueType = Array<{
	calculatedEndDate: string;
	subName: string;
	firstName: string;
}>;
