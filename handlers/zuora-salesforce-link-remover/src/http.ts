import { z } from 'zod';

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

		const result = await fetch(sfApiUserAuth.url, options);

		if (!result.ok) {
			const errorText = await result.text();
			const errorMessage = `Error response from Salesforce: ${errorText}`;
			console.error(errorMessage);
			throw new Error(errorMessage);
		}

		console.log('successfully authenticated with Salesforce');

		const sfAuthResponse = (await result.json()) as SfAuthResponse;

		const parseResult = SalesforceAuthResponseSchema.safeParse(sfAuthResponse);

		if (!parseResult.success) {
			const parseError = `Error parsing response from Salesforce: ${JSON.stringify(parseResult.error.format())}`;
			console.error(parseError);
			throw new Error(parseError);
		}

		return parseResult.data;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorText = `Error authenticating with Salesforce: ${errorMessage}`;
		console.error(errorText);
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

const SalesforceAuthResponseSchema = z.object({
	access_token: z.string(),
	instance_url: z.string().url(),
	id: z.string().url(),
	token_type: z.string(),
	issued_at: z.string(),
	signature: z.string(),
});
type SfAuthResponse = z.infer<typeof SalesforceAuthResponseSchema>;

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

export async function executeSalesforceQuery(
	sfAuthResponse: SfAuthResponse,
	query: string,
): Promise<SalesforceQueryResponse> {

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

	const sfQueryResponse = (await response.json()) as SalesforceQueryResponse;

	const parseResult = SalesforceQueryResponseSchema.safeParse(sfQueryResponse);

	if (!parseResult.success) {
		const parseError = `Error parsing response from Salesforce: ${JSON.stringify(parseResult.error.format())}`;
		console.error(parseError);
		throw new Error(parseError);
	}

	return parseResult.data;
}

const sfApiVersion = (): string => {
	const sfApiVersion = process.env.SF_API_VERSION;

	if (!sfApiVersion) {
		return 'v54.0';
	}
	return sfApiVersion;
};

const SalesforceAttributesSchema = z.object({
	type: z.string(),
	url: z.string(),
});

const BillingAccountRecordSchema = z.object({
	attributes: SalesforceAttributesSchema,
	Id: z.string(),
	Zuora__Account__c: z.string(),
	GDPR_Removal_Attempts__c: z.string(),
	Zuora__External_Id__c: z.string(),
});
export type BillingAccountRecord = z.infer<typeof BillingAccountRecordSchema>;

const SalesforceQueryResponseSchema = z.object({
	totalSize: z.number(),
	done: z.boolean(),
	records: z.array(BillingAccountRecordSchema),
});
export type SalesforceQueryResponse = z.infer<
	typeof SalesforceQueryResponseSchema
>;
