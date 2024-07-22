import { z } from 'zod';

export async function doCompositeCallout(
	url: string,
	token: string,
	body: string,
): Promise<SalesforceUpdateResponse[]> {
	console.log('doing composite callout...');

	try {
		const options = {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body,
		};

		const response = await fetch(url, options);
		if (!response.ok) {
			throw new Error(
				`Error updating record(s) in Salesforce: ${response.statusText}`,
			);
		}

		const sfUpdateResponse =
			(await response.json()) as SalesforceUpdateResponse;
		const parseResponse =
			SalesforceUpdateResponseArraySchema.safeParse(sfUpdateResponse);

		if (!parseResponse.success) {
			throw new Error(
				`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}

		return parseResponse.data;
	} catch (error) {
		const errorText = `Error executing composite callout to Salesforce: ${JSON.stringify(error)}`;
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
const SalesforceUpdateResponseArraySchema = z.array(
	SalesforceUpdateResponseSchema,
);
export type SalesforceUpdateResponseArray = z.infer<
	typeof SalesforceUpdateResponseArraySchema
>;