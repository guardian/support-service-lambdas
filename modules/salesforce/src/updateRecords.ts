import { z } from 'zod';
import type { SfClient } from '@modules/salesforce/sfClient';

export async function doCompositeCallout(
	sfClient: SfClient,
	path: string,
	body: object,
): Promise<SalesforceUpdateResponse[]> {
	console.log('doing composite callout...');
	try {
		return await sfClient.patch(
			path,
			JSON.stringify(body),
			SalesforceUpdateResponseArraySchema,
		);
	} catch (error) {
		const errorTextBase = 'Error executing composite callout to Salesforce';
		const errorText =
			error instanceof Error
				? `${errorTextBase}: ${error.message}`
				: errorTextBase;

		throw new Error(errorText);
	}
}

const SalesforceUpdateErrorSchema = z.object({
	statusCode: z.string().optional(),
	message: z.string(),
	fields: z.array(z.string()),
});

const SalesforceUpdateResponseSchema = z.object({
	success: z.boolean(),
	errors: z.array(SalesforceUpdateErrorSchema),
});
export type SalesforceUpdateResponse = z.infer<
	typeof SalesforceUpdateResponseSchema
>;
export const SalesforceUpdateResponseArraySchema = z.array(
	SalesforceUpdateResponseSchema,
);
export type SalesforceUpdateResponseArray = z.infer<
	typeof SalesforceUpdateResponseArraySchema
>;
