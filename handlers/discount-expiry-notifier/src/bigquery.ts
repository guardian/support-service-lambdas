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
		tierId: z.string(),
		tier: z.number(),
		chargeId: z.string(),
		chargeName: z.string(),
		chargeType: z.string(),
		paymentFrequency: z.string(),
		upToPeriods: z.number(),
		upToPeriodsType: z.string(),
		effectiveStartDate: z.object({
			value: z.string(),
		}),
		effectiveEndDate: z.object({
			value: z.string(),
		}),
		calculatedEndDate: z.object({
			value: z.string(),
		}),
		monthsDiff: z.number(),
		subName: z.string(),
		isLatestVersion: z.boolean(),
		subStatus: z.string(),
		firstName: z.string(),
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
		SELECT 
			tier.id as tierId, 
			tier.tier as tier,
			charge.id as chargeId,
			charge.name as chargeName,
			charge.charge_type as chargeType,
			charge.billing_period as paymentFrequency,
			charge.up_to_periods as upToPeriods,
			charge.up_to_periods_type as upToPeriodsType,
			charge.effective_start_date as effectiveStartDate,
			charge.effective_end_date as effectiveEndDate,
			DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) as calculatedEndDate,
			DATE_DIFF(charge.effective_end_date, charge.effective_start_date, MONTH) as monthsDiff,
			sub.name as subName,
			sub.is_latest_version as isLatestVersion,
			sub.status as subStatus,
			contact.first_name as firstName
		FROM 
			datatech-fivetran.zuora.rate_plan_charge_tier tier 
		JOIN 
			datatech-fivetran.zuora.rate_plan_charge charge ON charge.id = tier.rate_plan_charge_id
		JOIN 
			datatech-fivetran.zuora.rate_plan rate_plan ON rate_plan.id = charge.rate_plan_id
		JOIN
			datatech-fivetran.zuora.product product ON product.id = tier.product_id
		JOIN 
			datatech-fivetran.zuora.subscription sub ON sub.id = tier.subscription_id
		JOIN 
			datatech-fivetran.zuora.contact contact ON contact.id = sub.sold_to_contact_id
		WHERE 
			product.name = 'Discounts' AND 
			charge.charge_type = 'Recurring' AND 
			charge.up_to_periods IS NOT NULL AND 
			charge.up_to_periods > 1 AND
			sub.is_latest_version = true AND 
			sub.status = 'Active' AND 
			DATE_ADD(charge.effective_start_date, INTERVAL charge.up_to_periods MONTH) = DATE_ADD(current_date(), INTERVAL 32 DAY) AND
			(tier.id='8a129b5d9349013f01935a2d75854d0f' OR tier.id = '8a1294769343a965019343cc4cf23590')
		ORDER BY 
			sub.name desc
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
