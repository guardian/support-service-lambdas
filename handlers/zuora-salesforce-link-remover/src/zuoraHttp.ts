import { z } from 'zod';

export async function doZuoraAuth(zuoraAuth: ZuoraAuth): Promise<string> {
	console.log('authenticating with Zuora...');
	const req = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams(zuoraAuth).toString(),
	};

	try {
		const result = await fetch(
			'https://rest.apisandbox.zuora.com/oauth/token',
			req,
		);

		if (!result.ok) {
			//can we get the error text out of the response rather than outputting full response?
			const errorMessage = `Error retrieving access token from Zuora: ${JSON.stringify(result)}`;
			console.error(errorMessage);
			throw new Error(errorMessage);
		}
		console.log('successfully authenticated with Zuora');

		const zuoraAuthResponse = (await result.json()) as ZuoraAuthResponse;

		const parseResult = ZuoraAuthResponseSchema.safeParse(zuoraAuthResponse);

		if (!parseResult.success) {
			const parseError = `Error parsing response from Zuora: ${JSON.stringify(parseResult.error.format())}`;
			console.error(parseError);
			throw new Error(parseError);
		}

		return parseResult.data.access_token;
	} catch (error) {
		throw new Error(String(error));
	}
}

export type ZuoraAuth = {
	client_id: string;
	client_secret: string;
	grant_type: 'client_credentials';
};

const ZuoraAuthResponseSchema = z.object({
	access_token: z.string(),
});
type ZuoraAuthResponse = z.infer<typeof ZuoraAuthResponseSchema>;

export async function updateBillingAccountInZuora(
	bearerToken: string,
	zuoraBillingAccountId: string,
): Promise<unknown> {
	console.log(
		`removing crmId from Billing Account ${zuoraBillingAccountId}...`,
	);

	const fields = {
		crmId: '',
	};

	const accountUpdateAttempt = await updateRecordInZuora(
		`https://rest.apisandbox.zuora.com/v1/accounts/${zuoraBillingAccountId}`,
		fields,
		bearerToken,
	);

	return accountUpdateAttempt;
}

export async function updateRecordInZuora(
	url: string,
	data: object,
	bearerToken: string,
): Promise<unknown> {

	const fetchReq = {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `bearer ${bearerToken}`,
		},
		body: JSON.stringify(data),
	};

	try {
		const response = await fetch(url, fetchReq);
		console.log('response:', response);

		if (!response.ok) {
			throw new Error(`Failed to update Zuora Billing Account: ${response.statusText}`);
		}

		const zuoraBillingAccountUpdateResponse = (await response.json()) as ZuoraBillingAccountUpdateResponse;
		console.log('zuoraBillingAccountUpdateResponse:', zuoraBillingAccountUpdateResponse);
		
		const parseResponse = ZuoraBillingAccountUpdateResponseSchema.safeParse(zuoraBillingAccountUpdateResponse);

		if (!parseResponse.success) {
			const parseError = `Error parsing response from Zuora: ${JSON.stringify(parseResponse.error.format())}`;
			console.error(parseError);
			throw new Error(parseError);
		}
	
		return parseResponse.data;
	} catch (error) {
		// Handle network errors or JSON parsing errors
		// return { error: error.message };
		throw new Error(String(error));
	}
}

const ZuoraBillingAccountUpdateResponseSchema = z.object({
	success: z.boolean(),
});
export type ZuoraBillingAccountUpdateResponse = z.infer<
	typeof ZuoraBillingAccountUpdateResponseSchema
>;
