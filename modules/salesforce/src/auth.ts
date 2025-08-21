import { z } from 'zod';

export type SfConnectedAppAuth = {
	clientId: string;
	clientSecret: string;
};

export type SfApiUserAuth = {
	url: string;
	grant_type: string;
	username: string;
	password: string;
	token: string;
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

export async function doSfAuth(
	sfApiUserAuth: SfApiUserAuth,
	sfConnectedAppAuth: SfConnectedAppAuth,
): Promise<SfAuthResponse> {
	console.log('authenticating with Salesforce...');

	try {
		const options = {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: buildBody(sfApiUserAuth, sfConnectedAppAuth),
		};

		const response = await fetch(sfApiUserAuth.url, options);

		if (!response.ok) {
			const errorText = await response.text();
			const errorMessage = `Error response from Salesforce: ${errorText}`;

			throw new Error(errorMessage);
		}
		console.log('successfully authenticated with Salesforce');

		const sfAuthResponse = (await response.json()) as SfAuthResponse;

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

/**
 * Authenticates with Salesforce using OAuth 2.0 Client Credentials flow
 * This is useful when you only have client_id and client_secret (no user credentials)
 */
export async function doSfAuthClientCredentials(
	sfConnectedAppAuth: SfConnectedAppAuth,
	authUrl = 'https://login.salesforce.com/services/oauth2/token',
): Promise<SfAuthResponse> {
	console.log('authenticating with Salesforce using client credentials...');

	try {
		const options = {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: buildClientCredentialsBody(sfConnectedAppAuth),
		};

		const response = await fetch(authUrl, options);

		if (!response.ok) {
			const errorText = await response.text();
			const errorMessage = `Error response from Salesforce: ${errorText}`;
			throw new Error(errorMessage);
		}

		console.log('successfully authenticated with Salesforce using client credentials');

		const sfAuthResponse = (await response.json()) as SfAuthResponse;
		const parseResponse = SalesforceAuthResponseSchema.safeParse(sfAuthResponse);

		if (!parseResponse.success) {
			throw new Error(
				`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}

		return parseResponse.data;
	} catch (error) {
		const errorTextBase = 'Error authenticating with Salesforce using client credentials';
		const errorText =
			error instanceof Error
				? `${errorTextBase}: ${error.message}`
				: errorTextBase;
		throw new Error(errorText);
	}
}

function buildBody(
	sfApiUserAuth: SfApiUserAuth,
	sfConnectedAppAuth: SfConnectedAppAuth,
): string {
	return (
		`grant_type=password` +
		`&client_id=${sfConnectedAppAuth.clientId}` +
		`&client_secret=${sfConnectedAppAuth.clientSecret}` +
		`&username=${sfApiUserAuth.username}` +
		`&password=${sfApiUserAuth.password}${sfApiUserAuth.token}`
	);
}

function buildClientCredentialsBody(
	sfConnectedAppAuth: SfConnectedAppAuth,
): string {
	return (
		`grant_type=client_credentials` +
		`&client_id=${sfConnectedAppAuth.clientId}` +
		`&client_secret=${sfConnectedAppAuth.clientSecret}`
	);
}
