import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { getIdentityIdSchema } from './schemas';

export async function getIdentityClientAccessToken() {
	const ssmClient = new SSMClient(awsConfig);

	const params = {
		Name: '/CODE/support/press-reader-entitlements/identity-client-access-token',
		WithDecryption: true,
	};

	const command = new GetParameterCommand(params);

	const response = await ssmClient.send(command);
	return response.Parameter?.Value;
}

export async function getIdentityId(stage: Stage, userId: string) {
	const identityHost =
		stage === 'CODE'
			? 'https://idapi.code.dev-theguardian.com'
			: 'https://idapi.theguardian.com';
	const clientAccessToken = await getIdentityClientAccessToken();
	if (clientAccessToken == undefined) {
		throw new Error('Client access token not found');
	}
	const response = await fetch(`${identityHost}/user/braze-uuid/${userId}`, {
		headers: {
			'X-GU-ID-Client-Access-Token': `Bearer ${clientAccessToken}`,
		},
		method: 'GET',
	})
		.then(async (res) => {
			const json = await res.json();
			console.log(`Identity returned ${JSON.stringify(json)}`);
			return json;
		})
		.then((json) => getIdentityIdSchema.parse(json));

	if (response.status === 'ok') {
		return response.id;
	}
	throw new Error(
		`Failed to get identity id because of ${JSON.stringify(response)}`,
	);
}
