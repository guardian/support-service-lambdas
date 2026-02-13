import { z } from 'zod';

export type SfConnectedAppAuth = {
	clientId: string;
	clientSecret: string;
};

const SalesforceAuthResponseSchema = z.object({
	access_token: z.string(),
	instance_url: z.string().url(),
	id: z.string().url(),
	token_type: z.string(),
	issued_at: z.string(),
	signature: z.string(),
});
export type SfAuthResponse = z.infer<typeof SalesforceAuthResponseSchema>;

export async function authenticateSalesforce(
	authUrl: string,
	body: URLSearchParams,
): Promise<SfAuthResponse> {
	console.log('authenticating with Salesforce...');

	try {
		const response = await fetch(authUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Salesforce authentication failed: ${errorText}`);
		}

		console.log('successfully authenticated with Salesforce');

		const parsedResponse = SalesforceAuthResponseSchema.safeParse(
			await response.json(),
		);

		if (!parsedResponse.success) {
			throw new Error(
				`Error parsing response from Salesforce: ${JSON.stringify(parsedResponse.error.format())}`,
			);
		}

		return parsedResponse.data;
	} catch (error) {
		const errorTextBase = 'Error authenticating with Salesforce';
		const errorText =
			error instanceof Error
				? `${errorTextBase}: ${error.message}`
				: errorTextBase;
		throw new Error(errorText);
	}
}
