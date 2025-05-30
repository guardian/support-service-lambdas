import { getSecretValue } from '@modules/secrets-manager/getSecret';

type Stage = 'CODE' | 'CSBX' | 'PROD';

export async function getZuoraOAuthToken({
	stage,
}: {
	stage: Stage;
}): Promise<string> {
	const { client_id, client_secret } = await getSecretValue<{
		client_id: string;
		client_secret: string;
	}>(`${stage}/Zuora/User/AndreaDiotallevi`);

	const endpoint = {
		CODE: `https://rest.apisandbox.zuora.com/oauth/token`,
		CSBX: `https://rest.test.zuora.com/oauth/token`,
		PROD: `https://rest.zuora.com/oauth/token`,
	};

	const tokenUrl = endpoint[stage];

	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id,
		client_secret,
	});

	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString(),
	});

	const data = (await response.json()) as { access_token: string };
	return data.access_token;
}
