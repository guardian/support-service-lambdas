import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import type { SQSEvent } from 'aws-lambda';
import { DynamoVoucherRepository } from './adapters/dynamoVoucherRepository';
import { ImovoVoucherProvider } from './adapters/imovoVoucherProvider';
import { processVoucherRequest } from './domain/processVoucherRequest';
import { sqsMessageSchema } from './domain/schemas';

const dynamoClient = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

function getEnvVar(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}
	return value;
}

export const handler = async (event: SQSEvent): Promise<void> => {
	const stage = getEnvVar('STAGE');
	const baseUrl = getEnvVar('IMOVO_API_BASE_URL');
	const tableName = getEnvVar('VOUCHER_TABLE_NAME');

	const voucherProvider = new ImovoVoucherProvider(
		secretsClient,
		stage,
		baseUrl,
	);
	const voucherRepository = new DynamoVoucherRepository(
		dynamoClient,
		tableName,
	);

	console.log(`Processing ${event.Records.length} SQS record(s)`);

	for (const record of event.Records) {
		console.log(`Processing SQS record: ${record.messageId}`);

		const parsed = sqsMessageSchema.safeParse(JSON.parse(record.body));

		if (!parsed.success) {
			console.error(
				`Invalid message format: ${JSON.stringify(parsed.error.format())}`,
			);
			throw new Error('Invalid SQS message format');
		}

		const result = await processVoucherRequest(
			parsed.data,
			voucherProvider,
			voucherRepository,
		);

		console.log(
			`Voucher received: code=${result.voucherCode}, expires=${result.expiryDate}`,
		);

		// TODO: Send confirmation email via Braze once DataExtensionName is configured in Braze
		// const { sendEmail } = await import('@modules/email/email');
		// await sendEmail(stage, { ... });

		console.log(
			`Successfully processed voucher request for identityId=${result.identityId}`,
		);
	}

	console.log('All SQS records processed successfully');
};
