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
	stage: Stage,
): Promise<HmacKey> => {
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
export const getIdApiSecret = async (stage: Stage): Promise<IdApiToken> => {
	const client = new SecretsManagerClient(awsConfig);
	console.log(`Stage is ${stage}`);

	const command = new GetSecretValueCommand({
		//todo: remove hardcoded STAGE variable
		//		SecretId: `${stage}/TicketTailor/IdApi-token`,
		SecretId: `CODE/TicketTailor/IdApi-token`,
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
