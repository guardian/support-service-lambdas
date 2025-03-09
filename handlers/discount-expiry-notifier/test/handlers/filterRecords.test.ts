import { getIfDefined } from '@modules/nullAndUndefined';
import { handler } from '../../src/handlers/filterRecords';
import { allRecordsFromBigQuery } from './data/filterRecords/allRecordsFromBigQuery';

jest.mock('@modules/nullAndUndefined');

describe('filterRecords handler', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env.FILTER_BY_REGIONS = 'United States,United States of America';
	});

	it('should filter subscriptions based on region', async () => {
		(getIfDefined as jest.Mock).mockImplementation((envVar, errorMessage) => {
			if (envVar === process.env.FILTER_BY_REGIONS) {
				return process.env.FILTER_BY_REGIONS;
			}
			throw new Error(errorMessage as string);
		});

		const event = {
			discountExpiresOnDate: '2024-03-21',
			allRecordsFromBigQueryCount: 3,
			allRecordsFromBigQuery,
		};

		const result = await handler(event);

		expect(result).toBeDefined();
		expect(result.recordsForEmailSend).toBeInstanceOf(Array);
		expect(result.recordsForEmailSend.length).toBe(2);
		console.log('result.recordsForEmailSend:', result.recordsForEmailSend);
		expect(
			result.recordsForEmailSend.some((sub) => sub.zuoraSubName === 'A-S001'),
		).toBe(true);
		expect(
			result.recordsForEmailSend.some((sub) => sub.zuoraSubName === 'A-S002'),
		).toBe(true);
		expect(
			result.recordsForEmailSend.some((sub) => sub.zuoraSubName === 'A-S003'),
		).toBe(false);
	});

	it('should return an empty array if no subscriptions match the regions', async () => {
		(getIfDefined as jest.Mock).mockReturnValue('UK');

		const event = {
			discountExpiresOnDate: '2024-03-21',
			allRecordsFromBigQueryCount: 3,
			allRecordsFromBigQuery,
		};

		const result = await handler(event);

		expect(result).toBeDefined();
		expect(result.recordsForEmailSend).toBeInstanceOf(Array);
		expect(result.recordsForEmailSend.length).toBe(0);
	});

	it('should throw an error if FILTER_BY_REGIONS is not set', async () => {
		(getIfDefined as jest.Mock).mockImplementation(() => {
			throw new Error('FILTER_BY_REGIONS environment variable not set');
		});

		const event = {
			discountExpiresOnDate: '2024-03-21',
			allRecordsFromBigQueryCount: 3,
			allRecordsFromBigQuery,
		};

		await expect(handler(event)).rejects.toThrow(
			'FILTER_BY_REGIONS environment variable not set',
		);
	});
});
