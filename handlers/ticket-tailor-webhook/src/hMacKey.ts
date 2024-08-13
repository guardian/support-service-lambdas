import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';

export const getWebhookValidationSecret = async (
	stage: Stage,
): Promise<String> => {
	const client = new SecretsManagerClient(awsConfig);

	const command = new GetSecretValueCommand({
		SecretId: `${stage}/TicketTailor/Webhook-validation`,
	});

	const response = await client.send(command);
	if (!response.SecretString) {
		throw new Error(
			'SecretString was undefined in response from SecretsManager',
		);
	}

	return response.SecretString;
};
