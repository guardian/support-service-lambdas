import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { SQSEvent } from 'aws-lambda';
import { requestVoucher } from './imovoClient';
import type { VoucherRecord } from './schemas';
import { sqsMessageSchema } from './schemas';

const dynamoClient = new DynamoDBClient({});

function getEnvVar(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}
	return value;
}

async function saveVoucherRecord(
	tableName: string,
	record: VoucherRecord,
): Promise<void> {
	await dynamoClient.send(
		new PutItemCommand({
			TableName: tableName,
			Item: marshall(record),
		}),
	);
}

export const handler = async (event: SQSEvent): Promise<void> => {
	const stage = getEnvVar('STAGE');
	const baseUrl = getEnvVar('IMOVO_API_BASE_URL');
	const tableName = getEnvVar('VOUCHER_TABLE_NAME');

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

		const { email, identityId, voucherType } = parsed.data;
		const requestTimestamp = new Date().toISOString();

		console.log(
			`Requesting voucher for identityId=${identityId}, type=${voucherType}`,
		);

		const voucher = await requestVoucher(stage, baseUrl, voucherType);

		console.log(
			`Voucher received: code=${voucher.VoucherCode}, expires=${voucher.ExpiryDate}`,
		);

		const voucherRecord: VoucherRecord = {
			identityId,
			requestTimestamp,
			email,
			voucherType,
			voucherCode: voucher.VoucherCode,
			expiryDate: voucher.ExpiryDate,
			status: 'SUCCESS',
		};

		await saveVoucherRecord(tableName, voucherRecord);
		console.log(`Voucher record saved to DynamoDB`);

		// TODO: Send confirmation email via Braze once DataExtensionName is configured in Braze
		// const { sendEmail } = await import('@modules/email/email');
		// await sendEmail(stage, { ... });

		console.log(
			`Successfully processed voucher request for identityId=${identityId}`,
		);
	}

	console.log('All SQS records processed successfully');
};
