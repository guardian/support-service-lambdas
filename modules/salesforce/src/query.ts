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
