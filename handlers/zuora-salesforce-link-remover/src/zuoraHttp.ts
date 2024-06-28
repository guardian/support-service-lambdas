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

	const formData = new FormData();
	formData.set('crmId', '');

	console.log('formData:',formData);
	console.log('JSON.stringify(formData):', JSON.stringify(formData));

	const accountUpdateAttempt = await updateRecordInZuora(
		`https://rest.apisandbox.zuora.com/v1/accounts/${zuoraBillingAccountId}`,
		formData,
		bearerToken,
	);

	return accountUpdateAttempt;
}

export async function updateRecordInZuora(
	url: string,
	data: object,
	bearerToken: string,
): Promise<unknown> {
	console.log('updating record in Zuora: url:', url);
	console.log('data:', data);
	console.log('JSON.stringify(data):', JSON.stringify(data));
	const fetchReq = {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `bearer ${bearerToken}`,
		},
		body: JSON.stringify(data),
	};
	// console.log('fetchReq:',fetchReq);

	try {
		const response = await fetch(url, fetchReq);
		console.log('response:', response);

		const responseData = await response.json();
		console.log('responseData:', responseData);

		if (!response.ok) {
			// Handle non-200 responses
			return responseData; // Return the error response
		}
		return responseData; // Return the successful response
	} catch (error) {
		// Handle network errors or JSON parsing errors
		// return { error: error.message };
		throw new Error(String(error));
	}
}
