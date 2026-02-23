import type * as DynamoDBClientModule from '@aws-sdk/client-dynamodb';
import type { SfClient } from '@modules/salesforce/sfClient';
import { generateCSV, handler } from '../src/handlers/salesforceExport';

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

const mockSfClientCreate = jest.fn();
const mockSfClientPost = jest.fn();
const mockSfClientPut = jest.fn();
const mockSfClientPatch = jest.fn();
const mockSfClientGet = jest.fn();
const mockSfClientDelete = jest.fn();

jest.mock('@modules/salesforce/sfClient', () => ({
	SfClient: {
		createWithClientCredentials: (...args: unknown[]): Promise<SfClient> =>
			mockSfClientCreate(...args) as Promise<SfClient>,
	},
}));

describe('salesforceExport handler', () => {
	const mockSfClient: SfClient = {
		post: mockSfClientPost,
		put: mockSfClientPut,
		patch: mockSfClientPatch,
		get: mockSfClientGet,
		delete: mockSfClientDelete,
	} as unknown as SfClient;

	beforeEach(() => {
		jest.clearAllMocks();
		mockSend.mockReset();
		mockLoggerLog.mockClear();
		mockLoggerError.mockClear();
		mockSfClientCreate.mockResolvedValue(mockSfClient);
		process.env.STAGE = 'CODE';
	});

	describe('generateCSV', () => {
		it('should generate CSV with headers and data rows', () => {
			const items = [
				{
					promo_code: 'PROMO1',
					promotion_name: 'Test Promotion',
					campaign_code: 'CAMPAIGN1',
					campaign_name: 'Test Campaign',
					channel_name: 'Direct',
					product_family: 'SupporterPlus',
					promotion_type: 'percent_discount',
					discount_percent: 20,
					discount_months: 3,
				},
				{
					promo_code: 'PROMO2',
					promotion_name: 'Test Promotion 2',
					campaign_code: 'CAMPAIGN2',
					campaign_name: 'Test Campaign 2',
					channel_name: 'Partner',
					product_family: 'Guardian Weekly',
					promotion_type: 'free_trial',
					discount_percent: 0,
					discount_months: 1,
				},
			];

			const result = generateCSV(items);

			const lines = result.split('\n');
			expect(lines).toHaveLength(3);
			expect(lines[0]).toBe(
				'"Name","Promotion_Name__c","Campaign_Name__c","Channel_Name__c","Product_Family__c","Promotion_Type__c","Discount_Percent__c","Discount_Months__c"',
			);
			expect(lines[1]).toBe(
				'"PROMO1","Test Promotion","Test Campaign","Direct","SupporterPlus","percent_discount","20","3"',
			);
			expect(lines[2]).toBe(
				'"PROMO2","Test Promotion 2","Test Campaign 2","Partner","Guardian Weekly","free_trial","0","1"',
			);
		});

		it('should handle empty items array', () => {
			const result = generateCSV([]);

			const lines = result.split('\n');
			expect(lines).toHaveLength(1);
			expect(lines[0]).toContain('Name');
		});
	});

	describe('exportToSalesforce', () => {
		it('should complete full export workflow successfully', async () => {
			const jobId = 'test-job-id';
			mockSfClientPost.mockResolvedValueOnce({ id: jobId, state: 'Open' });
			mockSfClientPut.mockResolvedValueOnce({});
			mockSfClientPatch.mockResolvedValueOnce({ state: 'UploadComplete' });
			mockSfClientGet.mockResolvedValueOnce({ state: 'JobComplete' });
			mockSfClientDelete.mockResolvedValueOnce({});

			mockSend.mockResolvedValueOnce({
				Items: [
					{
						promo_code: { S: 'PROMO1' },
						promotion_name: { S: 'Test' },
						campaign_name: { S: 'Campaign' },
						campaign_code: { S: 'CAMPAIGN1' },
						channel_name: { S: 'Direct' },
						product_family: { S: 'SupporterPlus' },
						promotion_type: { S: 'percent_discount' },
						discount_percent: { N: '10' },
						discount_months: { N: '1' },
					},
				],
			});

			await handler();

			expect(mockSfClientPost).toHaveBeenCalledTimes(1);
			expect(mockSfClientPut).toHaveBeenCalledTimes(1);
			expect(mockSfClientPatch).toHaveBeenCalledTimes(1);
			expect(mockSfClientGet).toHaveBeenCalledTimes(1);
			expect(mockSfClientDelete).toHaveBeenCalledTimes(1);
			expect(mockLoggerLog).toHaveBeenCalledWith(
				'Successfully exported promo codes to Salesforce',
			);
		});

		it('should poll until job completes', async () => {
			const jobId = 'test-job-id';
			mockSfClientPost.mockResolvedValueOnce({ id: jobId, state: 'Open' });
			mockSfClientPut.mockResolvedValueOnce({});
			mockSfClientPatch.mockResolvedValueOnce({ state: 'UploadComplete' });
			mockSfClientGet
				.mockResolvedValueOnce({ state: 'InProgress' })
				.mockResolvedValueOnce({ state: 'InProgress' })
				.mockResolvedValueOnce({ state: 'JobComplete' });
			mockSfClientDelete.mockResolvedValueOnce({});

			mockSend.mockResolvedValueOnce({
				Items: [
					{
						promo_code: { S: 'PROMO1' },
						promotion_name: { S: 'Test' },
						campaign_name: { S: 'Campaign' },
						campaign_code: { S: 'CAMPAIGN1' },
						channel_name: { S: 'Direct' },
						product_family: { S: 'SupporterPlus' },
						promotion_type: { S: 'percent_discount' },
						discount_percent: { N: '10' },
						discount_months: { N: '1' },
					},
				],
			});

			await handler();

			expect(mockSfClientGet).toHaveBeenCalledTimes(3);
		});

		it('should throw error when job fails', async () => {
			const jobId = 'test-job-id';
			mockSfClientPost.mockResolvedValueOnce({ id: jobId, state: 'Open' });
			mockSfClientPut.mockResolvedValueOnce({});
			mockSfClientPatch.mockResolvedValueOnce({ state: 'UploadComplete' });
			mockSfClientGet.mockResolvedValueOnce({
				state: 'Failed',
				errorMessage: 'Salesforce error',
			});

			mockSend.mockResolvedValueOnce({
				Items: [
					{
						promo_code: { S: 'PROMO1' },
						promotion_name: { S: 'Test' },
						campaign_name: { S: 'Campaign' },
						campaign_code: { S: 'CAMPAIGN1' },
						channel_name: { S: 'Direct' },
						product_family: { S: 'SupporterPlus' },
						promotion_type: { S: 'percent_discount' },
						discount_percent: { N: '10' },
						discount_months: { N: '1' },
					},
				],
			});

			await expect(handler()).rejects.toThrow('Job failed: Salesforce error');
			expect(mockLoggerError).toHaveBeenCalledWith(
				'Error exporting to Salesforce',
				expect.any(Error),
			);
		});

		it('should throw error when close job returns wrong state', async () => {
			const jobId = 'test-job-id';
			mockSfClientPost.mockResolvedValueOnce({ id: jobId, state: 'Open' });
			mockSfClientPut.mockResolvedValueOnce({});
			mockSfClientPatch.mockResolvedValueOnce({ state: 'Failed' });

			mockSend.mockResolvedValueOnce({
				Items: [
					{
						promo_code: { S: 'PROMO1' },
						promotion_name: { S: 'Test' },
						campaign_name: { S: 'Campaign' },
						campaign_code: { S: 'CAMPAIGN1' },
						channel_name: { S: 'Direct' },
						product_family: { S: 'SupporterPlus' },
						promotion_type: { S: 'percent_discount' },
						discount_percent: { N: '10' },
						discount_months: { N: '1' },
					},
				],
			});

			await expect(handler()).rejects.toThrow(
				'Job state is not UploadComplete',
			);
		});
	});
});
