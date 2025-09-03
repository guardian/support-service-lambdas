import type { Logger } from '@modules/logger';
import {
	buildClientCredentialsBody,
	getSalesForceApiBaseUrl,
} from '../helpers';
import type { SalesforceAuthResponse, SalesforceCredentials } from '../types';
import { SalesforceAuthResponseSchema } from '../zod-schemas';

/**
 * Authenticate with Salesforce using OAuth 2.0 Client Credentials flow
 *
 * This function performs OAuth authentication to obtain an access token
 * for making authenticated requests to the Salesforce API.
 *
 * @param logger - Logger instance for tracking authentication process
 * @param credentials - Salesforce OAuth credentials including client ID, secret, and sandbox flag
 * @returns Promise containing Salesforce access token and instance URL
 * @throws {Error} When authentication fails or response validation fails
 */
export async function authenticateWithSalesforce(
	logger: Logger,
	credentials: SalesforceCredentials,
): Promise<SalesforceAuthResponse> {
	logger.log('authenticating with Salesforce using client credentials...');

	try {
		const options = {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: buildClientCredentialsBody(credentials),
		};

		const salesforceUrl = `${getSalesForceApiBaseUrl(credentials.sandbox)}/services/oauth2/token`;

		logger.log('Salesforce URL:', salesforceUrl);

		const response = await fetch(salesforceUrl, options);

		if (!response.ok) {
			const errorText = await response.text();
			const errorMessage = `Error response from Salesforce: ${errorText}`;
			throw new Error(errorMessage);
		}

		logger.log('successfully authenticated with Salesforce');

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
