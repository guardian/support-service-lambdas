import { BigQuery } from '@google-cloud/bigquery';
import type {
	BaseExternalAccountClient,
	ExternalAccountClientOptions,
} from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';
import { z } from 'zod';
import { testQueryResponse } from './testQueryResponse';

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
		zuoraSubName: z.string(),
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
		zuoraSubName: string;
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

	return testQueryResponse;
};
