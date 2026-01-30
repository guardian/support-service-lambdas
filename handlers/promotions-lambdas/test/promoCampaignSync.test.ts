import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import { handler } from '../src/handlers/promoCampaignSync';
import { writeToDynamoDb } from '../src/lib/dynamodb';

jest.mock('../src/lib/dynamodb');

const mockedWriteToDynamoDb = jest.mocked(writeToDynamoDb);

describe('promoCampaignSync handler', () => {
	const validNewImage: Record<string, AttributeValue> = {
		code: { S: 'TEST_CODE' },
		group: { S: 'digitalpack' },
		name: { S: 'Test Campaign' },
	};

	const createEvent = (records: DynamoDBRecord[]): DynamoDBStreamEvent => ({
		Records: records,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.STAGE = 'CODE';
	});

	it('should write to DynamoDB on INSERT event', async () => {
		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: validNewImage,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		await handler(createEvent([record]));

		expect(mockedWriteToDynamoDb).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignCode: 'TEST_CODE',
				product: 'DigitalSubscription',
				name: 'Test Campaign',
			}),
			'support-admin-console-promo-campaigns-CODE',
		);
	});

	it('should write to DynamoDB on MODIFY event', async () => {
		process.env.STAGE = 'PROD';
		const record: DynamoDBRecord = {
			eventName: 'MODIFY',
			dynamodb: {
				NewImage: validNewImage,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		await handler(createEvent([record]));

		expect(mockedWriteToDynamoDb).toHaveBeenCalledWith(
			expect.objectContaining({
				campaignCode: 'TEST_CODE',
				product: 'DigitalSubscription',
				name: 'Test Campaign',
			}),
			'support-admin-console-promo-campaigns-PROD',
		);
	});

	it('should return batch item failure when NewImage is missing for INSERT', async () => {
		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		const result = await handler(createEvent([record]));

		expect(result.batchItemFailures).toEqual([{ itemIdentifier: '123' }]);
	});

	it('should return batch item failure when campaign transformation fails', async () => {
		const invalidImage: Record<string, AttributeValue> = {
			code: { S: 'TEST_CODE' },
			group: { S: 'invalid_group' },
		};

		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: invalidImage,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		const result = await handler(createEvent([record]));

		expect(result.batchItemFailures).toEqual([{ itemIdentifier: '123' }]);
	});

	it('should process multiple records and return partial failures', async () => {
		const validRecord: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: validNewImage,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		const invalidRecord: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: { code: { S: 'TEST' }, group: { S: 'invalid' } },
				SequenceNumber: '456',
			},
		} as DynamoDBRecord;

		const result = await handler(createEvent([validRecord, invalidRecord]));

		expect(mockedWriteToDynamoDb).toHaveBeenCalledTimes(1);
		expect(result.batchItemFailures).toEqual([{ itemIdentifier: '456' }]);
	});
});
