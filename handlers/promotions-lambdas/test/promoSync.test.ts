import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import { handler } from '../src/handlers/promoSync';
import { writeToDynamoDb } from '../src/lib/dynamodb';

jest.mock('../src/lib/dynamodb');

const mockedWriteToDynamoDb = jest.mocked(writeToDynamoDb);

describe('promoSync handler', () => {
	const validNewImage: Record<string, AttributeValue> = {
		uuid: { S: '8aa00f4d-5ad2-4a40-a088-66c344b194c6' },
		appliesTo: {
			M: {
				countries: { L: [{ S: 'GB' }] },
				productRatePlanIds: {
					L: [
						{ S: '2c92c0f965f2122101660fb33ed24a45' },
						{ S: '2c92c0f965d280590165f16b1b9946c2' },
					],
				},
			},
		},
		campaignCode: { S: 'C_ME8DW87P' },
		codes: {
			M: {
				PROMO_CODE_1: { L: [{ S: 'PROMO_CODE_1' }] },
				PROMO_CODE_2: { L: [{ S: 'PROMO_CODE_2' }] },
			},
		},
		description: { S: 'description' },
		landingPage: {
			M: {
				description: { S: 'description' },
				roundelHtml: { S: 'price card' },
				title: { S: 'Title' },
				type: { S: 'weekly' },
			},
		},
		name: { S: 'My promo' },
		promotionType: {
			M: {
				amount: { N: '50' },
				durationMonths: { N: '12' },
				name: { S: 'percent_discount' },
			},
		},
		starts: { S: '2025-11-17T00:00:00.000+00:00' },
		expires: { S: '2026-11-17T00:00:00.000+00:00' },
	};

	const expectedNewData = (promoCode: string) => ({
		promoCode,
		campaignCode: 'C_ME8DW87P',
		name: `My promo - ${promoCode}`,
		appliesTo: {
			productRatePlanIds: [
				'2c92c0f965f2122101660fb33ed24a45',
				'2c92c0f965d280590165f16b1b9946c2',
			],
			countries: ['GB'],
		},
		startTimestamp: '2025-11-17T00:00:00.000Z',
		endTimestamp: '2026-11-17T00:00:00.000Z',
		discount: {
			amount: 50,
			durationMonths: 12,
		},
		description: 'description',
		landingPage: {
			title: 'Title',
			description: 'description',
			roundelHtml: 'price card',
		},
	});

	const createEvent = (records: DynamoDBRecord[]): DynamoDBStreamEvent => ({
		Records: records,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.STAGE = 'CODE';
	});

	it('should write multiple items to DynamoDB on INSERT event (one per promo code)', async () => {
		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: validNewImage,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		await handler(createEvent([record]));

		expect(mockedWriteToDynamoDb).toHaveBeenCalledTimes(2);

		const calls = mockedWriteToDynamoDb.mock.calls as Array<[object, string]>;
		const writtenPromoCodes = calls.map(
			([item]) => (item as { promoCode: string }).promoCode,
		);

		expect(writtenPromoCodes).toEqual(
			expect.arrayContaining(['PROMO_CODE_1', 'PROMO_CODE_2']),
		);

		calls.forEach(([item, tableName]) => {
			const promoCode = (item as { promoCode: string }).promoCode;
			expect(item).toEqual(expectedNewData(promoCode));
			expect(tableName).toBe('support-admin-console-promos-CODE');
		});
	});

	it('should write multiple items to DynamoDB on MODIFY event', async () => {
		const record: DynamoDBRecord = {
			eventName: 'MODIFY',
			dynamodb: {
				NewImage: validNewImage,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		await handler(createEvent([record]));

		expect(mockedWriteToDynamoDb).toHaveBeenCalledTimes(2);

		const calls = mockedWriteToDynamoDb.mock.calls as Array<[object, string]>;
		const writtenPromoCodes = calls.map(
			([item]) => (item as { promoCode: string }).promoCode,
		);

		expect(writtenPromoCodes).toEqual(
			expect.arrayContaining(['PROMO_CODE_1', 'PROMO_CODE_2']),
		);

		calls.forEach(([item, tableName]) => {
			const promoCode = (item as { promoCode: string }).promoCode;
			expect(item).toEqual(expectedNewData(promoCode));
			expect(tableName).toBe('support-admin-console-promos-CODE');
		});
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

	it('should return batch item failure when validation fails', async () => {
		const invalidImage: Record<string, AttributeValue> = {
			uuid: { S: '8aa00f4d-5ad2-4a40-a088-66c344b194c6' },
			campaignCode: { S: 'C_ME8DW87P' },
			// Missing required fields
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
				NewImage: { uuid: { S: 'invalid' } },
				SequenceNumber: '456',
			},
		} as DynamoDBRecord;

		const result = await handler(createEvent([validRecord, invalidRecord]));

		expect(mockedWriteToDynamoDb).toHaveBeenCalledTimes(2);
		expect(result.batchItemFailures).toEqual([{ itemIdentifier: '456' }]);
	});

	it('should handle promo with no codes gracefully', async () => {
		const imageWithNoCodes: Record<string, AttributeValue> = {
			...validNewImage,
			codes: { M: {} },
		};

		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: imageWithNoCodes,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		await handler(createEvent([record]));

		expect(mockedWriteToDynamoDb).not.toHaveBeenCalled();
	});

	it('should not include landingPage when title is undefined', async () => {
		const imageWithoutLandingPageTitle: Record<string, AttributeValue> = {
			...validNewImage,
			landingPage: {
				M: {
					type: { S: 'supporterPlus' },
				},
			},
		};

		const record: DynamoDBRecord = {
			eventName: 'INSERT',
			dynamodb: {
				NewImage: imageWithoutLandingPageTitle,
				SequenceNumber: '123',
			},
		} as DynamoDBRecord;

		await handler(createEvent([record]));

		expect(mockedWriteToDynamoDb).toHaveBeenCalledTimes(2);

		const calls = mockedWriteToDynamoDb.mock.calls as Array<[object, string]>;
		calls.forEach(([item]) => {
			expect(item).not.toHaveProperty('landingPage');
		});
	});
});
