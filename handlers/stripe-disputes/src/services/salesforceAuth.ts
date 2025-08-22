import * as console from 'node:console';
import type { Logger } from '@modules/logger';
import { z } from 'zod';
import { getSalesForceApiBaseUrl } from '../helpers';

export type SalesforceCredentials = {
	client_id: string;
	client_secret: string;
	username: string;
	password: string; // should include security token
	sandbox: boolean;
	token: string; // optional, if not included in password
};

const SalesforceAuthResponseSchema = z.object({
	access_token: z.string(),
	instance_url: z.string().url(),
	id: z.string().url(),
	token_type: z.string(),
	issued_at: z.string(),
	signature: z.string(),
});

export type SalesforceAuthResponse = z.infer<
	typeof SalesforceAuthResponseSchema
>;

/**
 * Authenticate with Salesforce using OAuth 2.0 Client Credentials flow
 * Follows the pattern from @modules/salesforce/src/auth.ts but for client credentials
 */
export async function authenticateWithSalesforce(
	logger: Logger,
	credentials: SalesforceCredentials,
): Promise<SalesforceAuthResponse> {
	console.log('authenticating with Salesforce using client credentials...');

	try {
		const options = {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: buildClientCredentialsBody(credentials),
		};

		const salesforceUrl = `${getSalesForceApiBaseUrl(credentials.sandbox)}/services/oauth2/token`;

		logger.log('Salesforce URL:', salesforceUrl);
		logger.log('Request options:', options);

		const response = await fetch(salesforceUrl, options);

		if (!response.ok) {
			const errorText = await response.text();
			const errorMessage = `Error response from Salesforce: ${errorText}`;
			throw new Error(errorMessage);
		}

		console.log('successfully authenticated with Salesforce');

		const sfAuthResponse = (await response.json()) as SalesforceAuthResponse;

		const parseResponse =
			SalesforceAuthResponseSchema.safeParse(sfAuthResponse);

		if (!parseResponse.success) {
			throw new Error(
				`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}

		return parseResponse.data;
	} catch (error) {
		const errorTextBase = 'Error authenticating with Salesforce';
		const errorText =
			error instanceof Error
				? `${errorTextBase}: ${error.message}`
				: errorTextBase;
		throw new Error(errorText);
	}
}

function buildClientCredentialsBody(
	credentials: SalesforceCredentials,
): string {
	const password = `${credentials.password}${credentials.token}`;

	return (
		`grant_type=client_credentials` +
		`&client_id=${encodeURIComponent(credentials.client_id)}` +
		`&client_secret=${encodeURIComponent(credentials.client_secret)}` +
		`&username=${encodeURIComponent(credentials.username)}` +
		`&password=${encodeURIComponent(password)}`
	);
}
