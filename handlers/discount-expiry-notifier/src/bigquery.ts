import { BigQuery } from '@google-cloud/bigquery';
import type {
	BaseExternalAccountClient,
	ExternalAccountClientOptions,
} from 'google-auth-library';
import { ExternalAccountClient } from 'google-auth-library';
import { z } from 'zod';
import { testQueryResponse } from './testQueryResponse';
import type { BigQueryRecord } from './types';

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
			.union([
				z.object({
					value: z.string(),
				}),
				z.string(),
			])
			.transform((val) => (typeof val === 'string' ? val : val.value)),
		paymentAmount: z.number().transform((val) => parseFloat(val.toFixed(2))),
		paymentCurrency: z.string(),
		paymentFrequency: z.string(),
		productName: z.string(),
		sfContactId: z.string(),
		zuoraSubName: z.string(),
		workEmail: z.string().nullable(),
		contactCountry: z.string().nullable(),
		sfBuyerContactMailingCountry: z.string().nullable(),
		sfBuyerContactOtherCountry: z.string().nullable(),
		sfRecipientContactMailingCountry: z.string().nullable(),
		sfRecipientContactOtherCountry: z.string().nullable(),
	}),
);

// export const BigQueryResultDataSchema2 = z.array(
// 	z.object({
// 		firstName: z.string(),
// 		nextPaymentDate: z.string(),
// 		paymentAmount: z.number().transform((val) => parseFloat(val.toFixed(2))),
// 		paymentCurrency: z.string(),
// 		paymentFrequency: z.string(),
// 		productName: z.string(),
// 		sfContactId: z.string(),
// 		zuoraSubName: z.string(),
// 		workEmail: z.string().nullable(),
// 		contactCountry: z.string().nullable(),
// 		sfBuyerContactMailingCountry: z.string().nullable(),
// 		sfBuyerContactOtherCountry: z.string().nullable(),
// 		sfRecipientContactMailingCountry: z.string().nullable(),
// 		sfRecipientContactOtherCountry: z.string().nullable(),
// 	}),
// );

export const runQuery = async (
	authClient: BaseExternalAccountClient,
	query: string,
): Promise<BigQueryRecord[]> => {
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
