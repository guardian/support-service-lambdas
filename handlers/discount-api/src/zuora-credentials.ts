import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '../../../modules/Stage';
import { zuoraCredentialsSchema } from './zuora.zod';

export const getCredentials = async (stage: Stage) => {
	const client = new SecretsManagerClient({
		region: 'eu-west-1',
		credentials: defaultProvider({ profile: 'membership' }),
	});

	const command = new GetSecretValueCommand({
		SecretId: `${stage}/Zuora-OAuth/SupportServiceLambdas`,
	});

	try {
		const response = await client.send(command);
		if (!response.SecretString) throw new Error('No secret string');
		return zuoraCredentialsSchema.parse(JSON.parse(response.SecretString));
	} catch (error) {
		// For a list of exceptions thrown, see
		// https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
		console.error(error);
		throw error;
	}
};
