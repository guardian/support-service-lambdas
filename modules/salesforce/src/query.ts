import type { z } from 'zod';
import type { SfAuthResponse } from './auth';
import { sfApiVersion } from './config';
import type { SalesforceQueryResponse } from './recordSchema';
import { SalesforceQueryResponseSchema } from './recordSchema';

export async function executeSalesforceQuery<T extends z.ZodTypeAny>(
	sfAuthResponse: SfAuthResponse,
	query: string,
	schema: T
  ): Promise<SalesforceQueryResponse<z.infer<T>>> {
	try {
		const response = await fetch(
			`${sfAuthResponse.instance_url}/services/data/${sfApiVersion()}/query?q=${encodeURIComponent(query)}`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${sfAuthResponse.access_token}`,
					'Content-Type': 'application/json',
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to execute query: ${response.statusText}`);
		}

		const sfQueryResponse = (await response.json()) as SalesforceQueryResponse<T>;

		const parseResponse = SalesforceQueryResponseSchema(schema).safeParse(sfQueryResponse);


		if (!parseResponse.success) {
			throw new Error(
				`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}

		return parseResponse.data;
	} catch (error) {
		const errorText = `Error querying Salesforce: ${JSON.stringify(error)}`;
		throw new Error(errorText);
	}
}