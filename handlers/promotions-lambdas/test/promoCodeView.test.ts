import type * as DynamoDBClientModule from '@aws-sdk/client-dynamodb';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
import {
	batchWriteRequestsForCodes,
	chunkedUpdateOfPromoCodes,
	fetchCampaigns,
	generatePutRequestFromNewPromoSchema,
	handleEventRecords,
	handler,
} from '../src/handlers/promoCodeView';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => {
	const actual = jest.requireActual<typeof DynamoDBClientModule>(
		'@aws-sdk/client-dynamodb',
	);
	return {
		...actual,
		DynamoDBClient: jest.fn().mockImplementation(() => ({
			send: (...args: unknown[]): Promise<unknown> =>
				mockSend(...args) as Promise<unknown>,
		})),
	};
});

const mockLoggerLog = jest.fn();
const mockLoggerError = jest.fn();
jest.mock('@modules/routing/logger', () => ({
	logger: {
		log: (...args: unknown[]): void => {
			mockLoggerLog(...args);
		},
		error: (...args: unknown[]): void => {
			mockLoggerError(...args);
		},
	},
}));

describe('promoCodeView handler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSend.mockReset();
		mockLoggerLog.mockClear();
		mockLoggerError.mockClear();
		process.env.STAGE = 'CODE';
	});

	describe('generatePutRequestFromNewPromoSchema', () => {
		const campaignDetails = {
			CAMPAIGN1: {
				campaign_name: 'Test Campaign',
				product_family: 'Subscription',
			},
		};

		it('should generate a put request for valid promo data', () => {
			const newImage: Record<string, AttributeValue> = {
				promoCode: { S: 'PROMO123' },
				campaignCode: { S: 'CAMPAIGN1' },
				name: { S: 'promotion name' },
				discount: {
					M: {
						amount: { N: '20' },
						durationMonths: { N: '3' },
					},
				},
				starts: { S: '2024-01-01' },
				expires: { S: '2024-12-31' },
				landingPage: {
					M: {
						title: { S: 'Landing page title' },
					},
				},
			};

			const result = generatePutRequestFromNewPromoSchema(
				newImage,
				campaignDetails,
			);

			expect(result).not.toBeNull();
			expect(result?.promoCode).toBe('PROMO123');
			expect(result?.request.PutRequest.Item.promo_code).toBe('PROMO123');
			expect(result?.request.PutRequest.Item.campaign_code).toBe('CAMPAIGN1');
			expect(result?.request.PutRequest.Item.campaign_name).toBe(
				'Test Campaign',
			);
			expect(result?.request.PutRequest.Item.product_family).toBe(
				'Subscription',
			);
			expect(result?.request.PutRequest.Item.promotion_name).toBe(
				'promotion name',
			);
			expect(result?.request.PutRequest.Item.discount_percent).toBe(20);
			expect(result?.request.PutRequest.Item.discount_months).toBe(3);
		});

		it('should return null when required fields are missing', () => {
			const newImage: Record<string, AttributeValue> = {
				promoCode: { S: 'PROMO123' },
			};

			const result = generatePutRequestFromNewPromoSchema(
				newImage,
				campaignDetails,
			);

			expect(result).toBeNull();
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'WARNING: Missing required promo fields, skipping record.',
				newImage,
			);
		});

		it('should return null when campaign is not found', () => {
			const newImage: Record<string, AttributeValue> = {
				promoCode: { S: 'PROMO123' },
				campaignCode: { S: 'UNKNOWN_CAMPAIGN' },
				name: { S: 'Test Promo' },
			};

			const result = generatePutRequestFromNewPromoSchema(
				newImage,
				campaignDetails,
			);

			expect(result).toBeNull();
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'WARNING: Campaign UNKNOWN_CAMPAIGN not found for promo PROMO123',
			);
		});

		it('should handle missing discount fields with defaults', () => {
			const newImage: Record<string, AttributeValue> = {
				promoCode: { S: 'PROMO123' },
				campaignCode: { S: 'CAMPAIGN1' },
				name: { S: 'No Discount Promo' },
				starts: { S: '2024-01-01' },
				expires: { S: '2024-12-31' },
			};

			const result = generatePutRequestFromNewPromoSchema(
				newImage,
				campaignDetails,
			);

			expect(result).not.toBeNull();
			expect(result?.request.PutRequest.Item.discount_percent).toBe(0);
			expect(result?.request.PutRequest.Item.discount_months).toBe(0);
		});
	});

	describe('handleEventRecords', () => {
		const campaignDetails = {
			CAMPAIGN1: {
				campaign_name: 'Test Campaign',
				product_family: 'Subscription',
			},
		};

		it('should process multiple records and return put requests', () => {
			const records: DynamoDBRecord[] = [
				{
					eventName: 'INSERT',
					dynamodb: {
						NewImage: {
							promoCode: { S: 'PROMO1' },
							campaignCode: { S: 'CAMPAIGN1' },
							name: { S: 'Promo One' },
							starts: { S: '2024-01-01' },
							expires: { S: '2024-12-31' },
						},
					},
				},
				{
					eventName: 'MODIFY',
					dynamodb: {
						NewImage: {
							promoCode: { S: 'PROMO2' },
							campaignCode: { S: 'CAMPAIGN1' },
							name: { S: 'Promo Two' },
							starts: { S: '2024-01-01' },
							expires: { S: '2024-12-31' },
						},
					},
				},
			] as DynamoDBRecord[];

			const result = handleEventRecords(records, campaignDetails);

			expect(Object.keys(result)).toHaveLength(2);
			expect(result['PROMO1']).toBeDefined();
			expect(result['PROMO2']).toBeDefined();
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'Successfully processed 2 records.',
			);
		});

		it('should return empty object for empty records array', () => {
			const result = handleEventRecords([], campaignDetails);

			expect(result).toEqual({});
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'Successfully processed 0 records.',
			);
		});
	});

	describe('fetchCampaigns', () => {
		it('should fetch campaigns for unique campaign codes in records', async () => {
			const records: DynamoDBRecord[] = [
				{
					dynamodb: {
						NewImage: {
							campaignCode: { S: 'CAMPAIGN1' },
						},
					},
				},
			] as DynamoDBRecord[];

			mockSend.mockResolvedValueOnce({
				Responses: {
					'support-admin-console-promo-campaigns-CODE': [
						{
							campaignCode: { S: 'CAMPAIGN1' },
							name: { S: 'Test Campaign 1' },
							product: { S: 'Subscription' },
						},
					],
				},
			});

			const result = await fetchCampaigns(records, 'CODE');

			expect(result).toEqual({
				CAMPAIGN1: {
					campaign_name: 'Test Campaign 1',
					product_family: 'Subscription',
				},
			});

			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'Retrieved 1 of 1 campaigns for stage CODE',
			);
		});

		it('should return empty object when no campaign codes in records', async () => {
			const records: DynamoDBRecord[] = [
				{
					dynamodb: {
						NewImage: {
							promoCode: { S: 'PROMO1' },
						},
					},
				},
			] as DynamoDBRecord[];

			const result = await fetchCampaigns(records, 'CODE');

			expect(result).toEqual({});
			expect(mockSend).not.toHaveBeenCalled();
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'No campaign codes found in records',
			);
		});
	});

	describe('batchWriteRequestsForCodes', () => {
		const putRequestsByPromoCode = {
			PROMO1: {
				PutRequest: {
					Item: {
						promo_code: 'PROMO1',
						campaign_code: 'CAMPAIGN1',
						promotion_name: 'Test Promo',
						campaign_name: 'Test Campaign',
						product_family: 'Subscription',
						promotion_type: 'percent_discount',
						discount_percent: 10,
						discount_months: 3,
						channel_name: 'test',
					},
				},
			},
		};

		it('should write batch successfully and return empty array', async () => {
			mockSend.mockResolvedValueOnce({});

			const result = await batchWriteRequestsForCodes(
				['PROMO1'],
				'CODE',
				putRequestsByPromoCode,
			);

			expect(result).toEqual([]);
			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'Successfully updated 1 promo code views.',
			);
		});

		it('should return failed promo codes when batch write fails', async () => {
			mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

			const result = await batchWriteRequestsForCodes(
				['PROMO1'],
				'CODE',
				putRequestsByPromoCode,
			);

			expect(result).toEqual(['PROMO1']);
			expect(mockLoggerError).toHaveBeenCalledWith(
				'Error writing batch to DynamoDB',
				expect.any(Error),
			);
		});
	});

	describe('chunkedUpdateOfPromoCodes', () => {
		it('should split large updates into chunks of 25', async () => {
			const putRequests: Record<
				string,
				{
					PutRequest: {
						Item: {
							promo_code: string;
							campaign_code: string;
							promotion_name: string;
							campaign_name: string;
							product_family: string;
							promotion_type: string;
							discount_percent: number;
							discount_months: number;
							channel_name: string;
						};
					};
				}
			> = {};
			for (let i = 0; i < 60; i++) {
				putRequests[`PROMO${i}`] = {
					PutRequest: {
						Item: {
							promo_code: `PROMO${i}`,
							campaign_code: 'TEST',
							promotion_name: 'Test',
							campaign_name: 'Test Campaign',
							product_family: 'Subscription',
							promotion_type: 'percent_discount',
							discount_percent: 10,
							discount_months: 3,
							channel_name: 'test',
						},
					},
				};
			}

			mockSend.mockResolvedValue({});

			const result = await chunkedUpdateOfPromoCodes('CODE', putRequests);

			expect(result).toEqual([]);
			expect(mockSend).toHaveBeenCalledTimes(3);
		});

		it('should handle empty putRequests', async () => {
			const result = await chunkedUpdateOfPromoCodes('CODE', {});

			expect(result).toEqual([]);
			expect(mockSend).not.toHaveBeenCalled();
		});
	});

	describe('handler', () => {
		const createEvent = (records: DynamoDBRecord[]): DynamoDBStreamEvent => ({
			Records: records,
		});

		it('should process stream events successfully', async () => {
			const event = createEvent([
				{
					eventID: '1',
					eventName: 'INSERT',
					dynamodb: {
						SequenceNumber: '001',
						NewImage: {
							promoCode: { S: 'PROMO1' },
							campaignCode: { S: 'CAMPAIGN1' },
							name: { S: 'Test Promo' },
							starts: { S: '2024-01-01' },
							expires: { S: '2024-12-31' },
						},
					},
				},
			] as DynamoDBRecord[]);

			mockSend
				.mockResolvedValueOnce({
					Responses: {
						'support-admin-console-promo-campaigns-CODE': [
							{
								campaignCode: { S: 'CAMPAIGN1' },
								name: { S: 'Test Campaign' },
								product: { S: 'Subscription' },
							},
						],
					},
				})
				.mockResolvedValueOnce({});

			const result = await handler(event);

			expect(result.batchItemFailures).toEqual([]);
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'Successfully updated 1 of 1 promo code views.',
			);
		});

		it('should handle missing stage in environment', async () => {
			const originalStage = process.env.STAGE;
			delete process.env.STAGE;

			const event = createEvent([
				{
					eventID: '1',
					eventName: 'INSERT',
					dynamodb: {
						SequenceNumber: '001',
						NewImage: {
							promoCode: { S: 'PROMO1' },
							campaignCode: { S: 'CAMPAIGN1' },
							name: { S: 'Test Promo' },
						},
					},
				},
			] as DynamoDBRecord[]);

			await expect(handler(event)).rejects.toThrow('Invalid STAGE');

			process.env.STAGE = originalStage;
		});

		it('should handle empty event records', async () => {
			const event = createEvent([]);

			const result = await handler(event);

			expect(result.batchItemFailures).toEqual([]);
			expect(mockSend).not.toHaveBeenCalled();
		});
	});
});
