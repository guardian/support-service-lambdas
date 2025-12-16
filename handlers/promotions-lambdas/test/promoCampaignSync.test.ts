import type { DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import {
	handler,
	transformDynamoDbEvent,
} from '../src/handlers/promoCampaignSync';

describe('promoCampaignSync handler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should process INSERT event', async () => {
		const event: DynamoDBStreamEvent = {
			Records: [],
		};

		const result = await handler(event);

		expect(result).toBeUndefined();
	});
});

describe('transformDynamoDbEvent', () => {
	it('should transform valid DynamoDB event to new campaign model', () => {
		const dynamoDbEvent: Record<string, AttributeValue> = {
			code: { S: 'TEST_DIGITAL_PACK' },
			group: { S: 'digitalpack' },
			name: { S: 'Digital Pack' },
		};

		const result = transformDynamoDbEvent(dynamoDbEvent);

		if (result instanceof Error) {
			throw new Error(
				`Error calling transformDynamoDbEvent: ${result.message}`,
			);
		}

		expect(result).toEqual({
			campaignCode: 'TEST_DIGITAL_PACK',
			product: 'DigitalPack',
			name: 'Digital Pack',
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest any
			created: expect.any(String),
		});
		expect(new Date(result.created).toISOString()).toBe(result.created);
	});

	it('should handle supporterPlus product group', () => {
		const dynamoDbEvent: Record<string, AttributeValue> = {
			code: { S: 'TEST_SUPPORTER_PLUS' },
			group: { S: 'supporterPlus' },
			name: { S: 'Test Campaign' },
		};

		const result = transformDynamoDbEvent(dynamoDbEvent);

		if (result instanceof Error) {
			throw new Error(
				`Error calling transformDynamoDbEvent: ${result.message}`,
			);
		}

		expect(result).toEqual({
			campaignCode: 'TEST_SUPPORTER_PLUS',
			product: 'SupporterPlus',
			name: 'Test Campaign',
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest any
			created: expect.any(String),
		});
		expect(new Date(result.created).toISOString()).toBe(result.created);
	});

	it('should return Error for invalid product group', () => {
		const dynamoDbEvent: Record<string, AttributeValue> = {
			code: { S: 'TEST_CODE' },
			group: { S: 'invalid' },
			name: { S: 'Test Campaign' },
		};

		const result = transformDynamoDbEvent(dynamoDbEvent);

		expect(result).toBeInstanceOf(Error);
	});

	it('should return Error for missing required fields', () => {
		const dynamoDbEvent: Record<string, AttributeValue> = {
			code: { S: 'TEST_CODE' },
		};

		const result = transformDynamoDbEvent(dynamoDbEvent);

		expect(result).toBeInstanceOf(Error);
	});
});
