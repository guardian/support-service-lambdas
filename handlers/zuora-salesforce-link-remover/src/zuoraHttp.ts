// import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

// export async function doZuoraAuth(): Promise<string> {
// 	console.log('authenticating with Zuora...');

// 	const zuoraClient = await ZuoraClient.create('CODE');
// 	const path = `v1/accounts/${zuoraBillingAccountId}`;

// 	const body = JSON.stringify({
// 		accountNumber,
// 		targetDate: zuoraDateFormat(targetDate),
// 		assumeRenewal: 'Autorenew',
// 	});
// 	return zuoraClient.post(path, body, billingPreviewSchema);
// 	return '';
// }

// export async function doZuoraAuth(zuoraAuth: ZuoraAuth): Promise<string> {
// 	console.log('authenticating with Zuora...');
// 	const req = {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/x-www-form-urlencoded',
// 		},
// 		body: new URLSearchParams(zuoraAuth).toString(),
// 	};

// 	try {
// 		const result = await fetch(
// 			'https://rest.apisandbox.zuora.com/oauth/token',
// 			req,
// 		);

// 		if (!result.ok) {
// 			//can we get the error text out of the response rather than outputting full response?
// 			const errorMessage = `Error retrieving access token from Zuora: ${JSON.stringify(result)}`;
// 			console.error(errorMessage);
// 			throw new Error(errorMessage);
// 		}
// 		console.log('successfully authenticated with Zuora');

// 		const zuoraAuthResponse = (await result.json()) as ZuoraAuthResponse;

// 		const parseResult = ZuoraAuthResponseSchema.safeParse(zuoraAuthResponse);

// 		if (!parseResult.success) {
// 			const parseError = `Error parsing response from Zuora: ${JSON.stringify(parseResult.error.format())}`;
// 			console.error(parseError);
// 			throw new Error(parseError);
// 		}

// 		return parseResult.data.access_token;
// 	} catch (error) {
// 		throw new Error(String(error));
// 	}
// }

export type ZuoraAuth = {
	client_id: string;
	client_secret: string;
	grant_type: 'client_credentials';
};

// const ZuoraAuthResponseSchema = z.object({
// 	access_token: z.string(),
// });
// type ZuoraAuthResponse = z.infer<typeof ZuoraAuthResponseSchema>;

export async function updateBillingAccountInZuora(
	accessToken: string,
	zuoraBillingAccountId: string,
): Promise<ZuoraBillingAccountUpdateResponse> {
	console.log(
		`removing crmId from Billing Account ${zuoraBillingAccountId}...`,
	);

	const fields = {
		crmId: '',
	};

	const accountUpdateAttempt = await updateRecordInZuora(
		`https://rest.apisandbox.zuora.com/v1/accounts/${zuoraBillingAccountId}`,
		fields,
		accessToken,
	);

	return accountUpdateAttempt;
}

export async function updateRecordInZuora(
	url: string,
	data: object,
	accessToken: string,
): Promise<ZuoraBillingAccountUpdateResponse> {
	const fetchReq = {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `bearer ${accessToken}`,
		},
		body: JSON.stringify(data),
	};

	try {
		const response = await fetch(url, fetchReq);

		if (!response.ok) {
			throw new Error(
				`Failed to update Zuora Billing Account: ${response.statusText}`,
			);
		}

		const zuoraBillingAccountUpdateResponse =
			(await response.json()) as ZuoraBillingAccountUpdateResponse;
		const parseResponse = ZuoraBillingAccountUpdateResponseSchema.safeParse(
			zuoraBillingAccountUpdateResponse,
		);

		if (!parseResponse.success) {
			const parseError = `Error parsing response from Zuora: ${JSON.stringify(parseResponse.error.format())}`;
			console.error(parseError);
			throw new Error(parseError);
		}

		return parseResponse.data;
	} catch (error) {
		throw new Error(String(error));
	}
}

const ReasonSchema = z.object({
	code: z.number(),
	message: z.string(),
});
const ZuoraBillingAccountUpdateResponseSchema = z.object({
	success: z.boolean(),
	reasons: z.array(ReasonSchema).optional(),
});
export type ZuoraBillingAccountUpdateResponse = z.infer<
	typeof ZuoraBillingAccountUpdateResponseSchema
>;
