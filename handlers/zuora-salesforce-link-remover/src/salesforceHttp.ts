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

		const response = await fetch(sfApiUserAuth.url, options);

		if (!response.ok) {
			const errorText = await response.text();
			const errorMessage = `Error response from Salesforce: ${errorText}`;
			console.error(errorMessage);
			throw new Error(errorMessage);
		}

		console.log('successfully authenticated with Salesforce');

		const sfAuthResponse = (await response.json()) as SfAuthResponse;

		const parseResponse =
			SalesforceAuthResponseSchema.safeParse(sfAuthResponse);

		if (!parseResponse.success) {
			const parseError = `Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`;
			console.error(parseError);
			throw new Error(parseError);
		}

		return parseResponse.data;
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

	const parseResponse =
		SalesforceQueryResponseSchema.safeParse(sfQueryResponse);

	if (!parseResponse.success) {
		const parseError = `Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`;
		console.error(parseError);
		throw new Error(parseError);
	}

	return parseResponse.data;
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
	GDPR_Removal_Attempts__c: z.number(),
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

export async function updateSfBillingAccounts(
	sfAuthResponse: SfAuthResponse,
): Promise<SalesforceUpdateResponse[]> {
	const url = `${sfAuthResponse.instance_url}/services/data/v59.0/composite/sobjects`;

	//body will be provided as a property of the input Event to the lambda.
	//Need to build the state machine and see what the exact body format will be. For now we use the estimated array of objects below.
	const body = JSON.stringify({
		allOrNone: false,
		records: [
			{
				id: 'a029E00000OEdL9QAL',
				GDPR_Removal_Attempts__c: '1',
				attributes: {
					type: 'Zuora__CustomerAccount__c',
				},
			},
			{
				id: 'a029E00000OEdMWQA1',
				GDPR_Removal_Attempts__c: '2',
				attributes: {
					type: 'Zuora__CustomerAccount__c',
				},
			},
		],
	});
	const sfUpdateResponse = await doCompositeCallout(
		url,
		sfAuthResponse.access_token,
		body,
	);
	return sfUpdateResponse;
}

export async function doCompositeCallout(
	url: string,
	token: string,
	body: string,
): Promise<SalesforceUpdateResponse[]> {
	console.log('doing composite callout...');

	const options = {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body,
	};

	const response = await fetch(url, options);
	console.log('response:', JSON.stringify(response));

	if (!response.ok) {
		throw new Error(
			`Error updating Billing Account(s) in Salesforce: ${response.statusText}`,
		);
	}

	const sfUpdateResponse = (await response.json()) as SalesforceUpdateResponse;
	const parseResponse =
		SalesforceUpdateResponseArraySchema.safeParse(sfUpdateResponse);
	console.log('parseResponse:', JSON.stringify(parseResponse));

	if (!parseResponse.success) {
		const parseError = `Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`;
		console.error(parseError);
		throw new Error(parseError);
	}

	return parseResponse.data;
}

const SalesforceUpdateRecordsSchema = z.object({
	id: z.string(),
	GDPR_Removal_Attempts__c: z.string(),
	attributes: z.object({
		type: z.string(),
	}),
});

const SalesforceCompositeRequestSchema = z.object({
	allOrNone: z.boolean(),
	records: z.array(SalesforceUpdateRecordsSchema),
});

export type SalesforceCompositeRequestBody = z.infer<
	typeof SalesforceCompositeRequestSchema
>;

const SalesforceUpdateRequestSchema = z.object({
	url: z.string(),
	token: z.string(),
	body: SalesforceCompositeRequestSchema,
});
export type SalesforceUpdateRequest = z.infer<
	typeof SalesforceUpdateRequestSchema
>;

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
