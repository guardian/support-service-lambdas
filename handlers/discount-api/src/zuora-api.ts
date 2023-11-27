import type { ZuoraBearerToken, ZuoraCredentials } from './zuora.zod';
import { zuoraBearerTokenSchema } from './zuora.zod';

const zuoraServerUrl = (stage: string) => {
	if (stage === 'PROD') {
		return 'https://rest.zuora.com';
	}
	return 'https://rest.apisandbox.zuora.com';
};
export const fetchZuoraBearerToken = async (
	stage: string,
	credentials: ZuoraCredentials,
): Promise<ZuoraBearerToken> => {
	console.log(`fetching zuora bearer token for stage: ${stage}`);
	const url = `${zuoraServerUrl(stage)}/oauth/token`;

	// Use URLSearchParams to encode the body of the request
	// https://jakearchibald.com/2021/encoding-data-for-post-requests/
	const formData = new URLSearchParams([
		['client_id', credentials.clientId],
		['client_secret', credentials.clientSecret],
		['grant_type', 'client_credentials'],
	]);

	const response = await fetch(url, {
		method: 'POST',
		body: formData,
	});

	const json = await response.json();
	console.log('Response from Zuora was: ', json);

	return zuoraBearerTokenSchema.parse(json);
};
