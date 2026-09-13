import type { z } from 'zod';
import type { SfClient } from '@modules/salesforce/sfClient';
import { sfApiVersion } from './config';
import type { SalesforceQueryResponse } from './recordSchema';
import { SalesforceQueryResponseSchema } from './recordSchema';

export async function executeSalesforceQuery<T extends z.ZodTypeAny>(
	sfClient: SfClient,
	query: string,
	schema: T,
): Promise<SalesforceQueryResponse<T>> {
	return await sfClient.get(
		`/services/data/${sfApiVersion()}/query?q=${encodeURIComponent(query)}`,
		SalesforceQueryResponseSchema(schema),
	);
}

export async function executeSalesforceQueryAll<T extends z.ZodTypeAny>(
	sfClient: SfClient,
	query: string,
	schema: T,
): Promise<SalesforceQueryResponse<T>['records']> {
	const firstPage = await executeSalesforceQuery(sfClient, query, schema);
	const records = [...firstPage.records];
	let nextRecordsUrl = firstPage.nextRecordsUrl;
	let done = firstPage.done;

	while (nextRecordsUrl !== undefined) {
		const page = await sfClient.get(
			nextRecordsUrl,
			SalesforceQueryResponseSchema(schema),
		);
		records.push(...page.records);
		nextRecordsUrl = page.nextRecordsUrl;
		done = page.done;
	}

	if (!done) {
		throw new Error(
			'Salesforce query response was incomplete without a next records URL',
		);
	}

	return records;
}
