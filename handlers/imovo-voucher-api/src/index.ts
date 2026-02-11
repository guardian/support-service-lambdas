import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import type { SQSEvent } from 'aws-lambda';
import { DynamoVoucherRepository } from './adapters/dynamoVoucherRepository';
import { ImovoVoucherProvider } from './adapters/imovoVoucherProvider';
import { handleSqsEvent } from './domain/handleSqsEvent';
import type { Dependencies } from './domain/ports';

const dynamoClient = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

function getEnvVar(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}
	return value;
}

function buildDependencies(): Dependencies {
	const stage = getEnvVar('STAGE');
	const baseUrl = getEnvVar('IMOVO_API_BASE_URL');
	const tableName = getEnvVar('VOUCHER_TABLE_NAME');

	return {
		voucherProvider: new ImovoVoucherProvider(secretsClient, stage, baseUrl),
		voucherRepository: new DynamoVoucherRepository(dynamoClient, tableName),
	};
}

export const handler = async (event: SQSEvent): Promise<void> => {
	const deps = buildDependencies();
	await handleSqsEvent(event, deps);
};
