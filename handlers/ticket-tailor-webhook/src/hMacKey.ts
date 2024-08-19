import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';

export type HmacKey = {
	secret: string;
};

export const getWebhookValidationSecret = async (
	stage: Stage,
): Promise<HmacKey> => {
	const client = new SecretsManagerClient(awsConfig);

	const command = new GetSecretValueCommand({
		SecretId: `${stage}/TicketTailor/Webhook-validation`,
	});

	const response = await client.send(command);
	if (response.SecretString) {
		return JSON.parse(response.SecretString) as HmacKey;
	} else {
		throw new Error(
			'SecretString was undefined in response from SecretsManager',
		);
	}
};
