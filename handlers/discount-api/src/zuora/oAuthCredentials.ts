import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '../../../../modules/stage';
import type { OAuthClientCredentials } from './zuoraSchemas';
import { oAuthClientCredentialsSchema } from './zuoraSchemas';

export const getOAuthClientCredentials = async (
	stage: Stage,
): Promise<OAuthClientCredentials> => {
	const isRunningLocally = !!process.env.LAMBDA_TASK_ROOT;
	const credentials = isRunningLocally
		? defaultProvider({
				profile: 'membership',
		  })
		: defaultProvider();

	const client = new SecretsManagerClient({
		region: 'eu-west-1',
		credentials,
	});

	const command = new GetSecretValueCommand({
		SecretId: `${stage}/Zuora-OAuth/SupportServiceLambdas`,
	});

	const response = await client.send(command);
	if (!response.SecretString) {
		throw new Error(
			'SecretString was undefined in response from SecretsManager',
		);
	}

	return oAuthClientCredentialsSchema.parse(JSON.parse(response.SecretString));
};
