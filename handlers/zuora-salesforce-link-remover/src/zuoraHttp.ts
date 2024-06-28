import { z } from 'zod';

export async function doZuoraAuth(
	zuoraAuth: ZuoraAuth
): Promise<string> {
	console.log('authenticating with Zuora...');
	const req = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams(zuoraAuth).toString(),
	};

	try {
		const result = await fetch('https://rest.apisandbox.zuora.com/oauth/token', req);

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
