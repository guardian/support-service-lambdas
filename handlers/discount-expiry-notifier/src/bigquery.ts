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

export const runQuery = async (
	authClient: BaseExternalAccountClient,
	query: string,
): Promise<
	Array<{
		firstName: string;
		nextPaymentDate: string;
		paymentAmount: number;
		paymentCurrency: string;
		paymentFrequency: string;
		productName: string;
		sfContactId: string;
		subName: string;
		workEmail: string;
	}>
> => {
	const bigquery = new BigQuery({
		projectId: `datatech-platform-code`,
		authClient,
	});

	const result = await bigquery.query(query);
	console.log('result', result);

	const resultData = BigQueryResultDataSchema.parse(result[0]);
	console.log('resultData', resultData);

	return [
		{
			firstName: 'David',
			nextPaymentDate: '2025-02-27',
			paymentAmount: 1.23,
			paymentCurrency: 'GBP',
			paymentFrequency: 'Month',
			productName: 'Supporter Plus',
			sfContactId: '0039E00001HiIGlQAN',
			subName: 'A-S00886188', // Active sub in dev sandbox
			workEmail: 'david.pepper+david@guardian.co.uk',
		},
		{
			firstName: 'Mary',
			nextPaymentDate: '2025-02-28',
			paymentAmount: 4.56,
			paymentCurrency: 'USD',
			paymentFrequency: 'Month',
			productName: 'Supporter Plus',
			sfContactId: '0039E00001HwhM9QAJ',
			subName: 'A-S00886159', // Active subscription in dev sandbox
			workEmail: 'graham.hopgood@guardian.co.uk',
		},
		{
			firstName: 'Robert',
			nextPaymentDate: '2025-02-28',
			paymentAmount: 7.89,
			paymentCurrency: 'USD',
			paymentFrequency: 'Month',
			productName: 'Supporter Plus',
			sfContactId: '0039E00001lNoXrQAK',
			subName: 'A-S00515481', // cancelled subscription in dev sandbox
			workEmail: 'david.pepper+3003+1@guardian.co.uk',
		},
	];
};
