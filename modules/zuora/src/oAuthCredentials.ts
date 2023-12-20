import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import type { OAuthClientCredentials } from './zuoraSchemas';
import { oAuthClientCredentialsSchema } from './zuoraSchemas';

export const getOAuthClientCredentials = async (
	stage: Stage,
): Promise<OAuthClientCredentials> => {
	const client = new SecretsManagerClient(awsConfig);

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
