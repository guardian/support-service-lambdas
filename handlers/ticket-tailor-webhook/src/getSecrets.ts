import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';

export type HmacKey = {
	secret: string;
};

export type IdApiToken = {
	token: string;
};
const client = new SecretsManagerClient(awsConfig);

export const getWebhookValidationSecret = async (
	stage: Stage | undefined,
): Promise<HmacKey> => {
	const stageName = stage ?? 'CODE';
	const command = new GetSecretValueCommand({
		SecretId: `${stageName}/TicketTailor/Webhook-validation`,
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
export const getIdApiSecret = async (
	stage: Stage | undefined,
): Promise<IdApiToken> => {
	const client = new SecretsManagerClient(awsConfig);

	const stageName: string = stage ?? 'CODE';
	const command = new GetSecretValueCommand({
		SecretId: `${stageName}/TicketTailor/IdApi-token`,
	});

	const response = await client.send(command);
	if (response.SecretString) {
		return JSON.parse(response.SecretString) as IdApiToken;
	} else {
		throw new Error(
			'SecretString was undefined in response from SecretsManager',
		);
	}
};
