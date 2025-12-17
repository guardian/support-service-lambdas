import type { DynamoDBRecord } from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import { handleRecord } from '../src/handlers/promoCampaignSync';
import { deleteFromDynamoDb, writeToDynamoDb } from '../src/lib/dynamodb';

jest.mock('../src/lib/dynamodb');

const mockedWriteToDynamoDb = jest.mocked(writeToDynamoDb);
const mockedDeleteFromDynamoDb = jest.mocked(deleteFromDynamoDb);

describe('handleRecord', () => {
	const validNewImage: Record<string, AttributeValue> = {
		code: { S: 'TEST_CODE' },
		group: { S: 'digitalpack' },
		name: { S: 'Test Campaign' },
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should write to DynamoDB on INSERT event', async () => {
		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: validNewImage,
			},
		} as DynamoDBRecord;

		await handleRecord(record, 'CODE');

		expect(mockedWriteToDynamoDb).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignCode: 'TEST_CODE',
				product: 'DigitalSubscription',
				name: 'Test Campaign',
			}),
			'support-admin-console-promo-campaigns-CODE',
		);
		expect(mockedDeleteFromDynamoDb).not.toHaveBeenCalled();
	});

	it('should write to DynamoDB on MODIFY event', async () => {
		const record: DynamoDBRecord = {
			eventName: 'MODIFY',
			dynamodb: {
				NewImage: validNewImage,
			},
		} as DynamoDBRecord;

		await handleRecord(record, 'PROD');

		expect(mockedWriteToDynamoDb).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignCode: 'TEST_CODE',
				product: 'DigitalSubscription',
				name: 'Test Campaign',
			}),
			'support-admin-console-promo-campaigns-PROD',
		);
	});

	it('should delete from DynamoDB on REMOVE event', async () => {
		const record: DynamoDBRecord = {
			eventName: 'REMOVE',
			dynamodb: {
				OldImage: validNewImage,
			},
		} as DynamoDBRecord;

		await handleRecord(record, 'CODE');

		expect(mockedDeleteFromDynamoDb).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignCode: 'TEST_CODE',
			}),
			'support-admin-console-promo-campaigns-CODE',
		);
		expect(mockedWriteToDynamoDb).not.toHaveBeenCalled();
	});

	it('should reject when NewImage is missing for INSERT', async () => {
		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {},
		} as DynamoDBRecord;

		await expect(handleRecord(record, 'CODE')).rejects.toThrow();
	});

	it('should reject when OldImage is missing for REMOVE', async () => {
		const record: DynamoDBRecord = {
			eventName: 'REMOVE',
			dynamodb: {},
		} as DynamoDBRecord;

		await expect(handleRecord(record, 'CODE')).rejects.toThrow();
	});

	it('should reject when campaign transformation fails', async () => {
		const invalidImage: Record<string, AttributeValue> = {
			code: { S: 'TEST_CODE' },
			group: { S: 'invalid_group' },
		};

		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: invalidImage,
			},
		} as DynamoDBRecord;

		await expect(handleRecord(record, 'CODE')).rejects.toThrow();
	});
});
