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
			throw new Error(errorMessage);
		}

		console.log('successfully authenticated with Salesforce');
		console.log('parsing response...', response);

		const sfAuthResponse = (await response.json()) as SfAuthResponse;
		console.log('instance_url', sfAuthResponse.instance_url);
		// const parseResponse =
		// 	SalesforceAuthResponseSchema.safeParse(sfAuthResponse);

		// if (!parseResponse.success) {
		// 	throw new Error(
		// 		`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
		// 	);
		// }

		return sfAuthResponse;
	} catch (error) {
		console.log('abc error:',error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorText = `Error authenticating with Salesforce: ${errorMessage}`;
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
	console.log('response:',response);
	if (!response.ok) {
		throw new Error(`Failed to execute query: ${response.statusText}`);
	}
	
	const sfQueryResponse = (await response.json()) as SalesforceQueryResponse;
	console.log('sfQueryResponse:',sfQueryResponse);

	const parseResponse =
		SalesforceQueryResponseSchema.safeParse(sfQueryResponse);
		console.log('parseResponse:',parseResponse);

	if (!parseResponse.success) {
		throw new Error(
			`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
		);
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
	url: z.string().optional(),
});

export const BillingAccountRecordSchema = z.object({
	attributes: SalesforceAttributesSchema,
	Id: z.string(),
	GDPR_Removal_Attempts__c: z.number(),
	Zuora__External_Id__c: z.string(),
});

export const BillingAccountRecordsSchema = z.array(BillingAccountRecordSchema);
export type BillingAccountRecord = z.infer<typeof BillingAccountRecordSchema>;

export const BillingAccountRecordWithSuccessSchema =
	BillingAccountRecordSchema.extend({
		crmIdRemovedSuccessfully: z.boolean(),
	});
export type BillingAccountRecordWithSuccess = z.infer<
	typeof BillingAccountRecordWithSuccessSchema
>;

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
	records: BillingAccountRecord[],
): Promise<SalesforceUpdateResponse[]> {
	const url = `${sfAuthResponse.instance_url}/services/data/${sfApiVersion()}/composite/sobjects`;

	const body = JSON.stringify({
		allOrNone: false,
		records,
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
	if (!response.ok) {
		throw new Error(
			`Error updating record(s) in Salesforce: ${response.statusText}`,
		);
	}

	const sfUpdateResponse = (await response.json()) as SalesforceUpdateResponse;
	const parseResponse =
		SalesforceUpdateResponseArraySchema.safeParse(sfUpdateResponse);

	if (!parseResponse.success) {
		throw new Error(
			`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
		);
	}

	return parseResponse.data;
}

const SalesforceUpdateRecordsSchema = z.object({
	id: z.string(),
	GDPR_Removal_Attempts__c: z.number(),
	attributes: z.object({
		type: z.string(),
	}),
});
export type SalesforceUpdateRecord = z.infer<
	typeof SalesforceUpdateRecordsSchema
>;
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
export type SalesforceUpdateResponseArray = z.infer<
	typeof SalesforceUpdateResponseArraySchema
>;
