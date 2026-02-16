import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { DynamoVoucherRepository } from '../../src/adapters/dynamoVoucherRepository';
import type { VoucherRecord } from '../../src/domain/schemas';

const mockSend = jest.fn();
const mockDynamoClient = { send: mockSend } as unknown as DynamoDBClient;

const tableName = 'vouchers-CODE';

const testRecord: VoucherRecord = {
	identityId: 'user-123',
	requestTimestamp: '2026-01-15T10:00:00.000Z',
	email: 'test@example.com',
	voucherType: 'DIGITAL_REWARD',
	voucherCode: 'VOUCHER-ABC',
	expiryDate: '2026-12-31',
	status: 'SUCCESS',
};

beforeEach(() => {
	mockSend.mockReset();
});

describe('DynamoVoucherRepository', () => {
	it('sends a PutItemCommand with the correct table name and marshalled record', async () => {
		mockSend.mockResolvedValueOnce({});

		const repository = new DynamoVoucherRepository(mockDynamoClient, tableName);
		await repository.save(testRecord);

		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockSend).toHaveBeenCalledWith(expect.any(PutItemCommand));
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: tableName,
					Item: marshall(testRecord),
				},
			}),
		);
	});

	it('propagates DynamoDB errors', async () => {
		mockSend.mockRejectedValueOnce(new Error('DynamoDB throttled'));

		const repository = new DynamoVoucherRepository(mockDynamoClient, tableName);

		await expect(repository.save(testRecord)).rejects.toThrow(
			'DynamoDB throttled',
		);
	});
});
