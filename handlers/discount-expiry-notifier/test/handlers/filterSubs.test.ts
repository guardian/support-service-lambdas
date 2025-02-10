import { getIfDefined } from '@modules/nullAndUndefined';
import { handler } from '../../src/handlers/filterSubs';
import { testQueryResponse } from '../../src/testQueryResponse';

jest.mock('@modules/nullAndUndefined');

describe('filterSubs handler', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env.FILTER_BY_REGIONS = 'United States,United States of America';
	});

	it('should filter subscriptions based on region (USA)', async () => {
		(getIfDefined as jest.Mock).mockImplementation((envVar, errorMessage) => {
			if (envVar === process.env.FILTER_BY_REGIONS) {
				return process.env.FILTER_BY_REGIONS;
			}
			throw new Error(errorMessage as string);
		});
		if (process.env.FILTER_BY_REGIONS === undefined) {
			throw new Error('FILTER_BY_REGIONS environment variable not set');
		}
		const filterByRegions =
			process.env.FILTER_BY_REGIONS.toLowerCase().split(',');

		const event = {
			discountExpiresOnDate: '2024-03-21',
			expiringDiscountsToProcess: testQueryResponse,
		};

		const result = await handler(event);

		expect(result).toBeDefined();

		expect(result.filteredSubs).toBeInstanceOf(Array);
		expect(result.filteredSubs.length).toBeGreaterThan(0);
		expect(
			result.filteredSubs.every((sub) =>
				filterByRegions.includes(sub.contactCountry.toLowerCase()),
			),
		).toBe(true);
		expect(
			result.filteredSubs.some((sub) => sub.zuoraSubName === 'A-S00886188'),
		).toBe(true);
		expect(
			result.filteredSubs.some((sub) => sub.zuoraSubName === 'A-S00886159'),
		).toBe(true);
		expect(
			result.filteredSubs.some((sub) => sub.zuoraSubName === 'A-S00515481'),
		).toBe(false);
	});

	it('should return an empty array if no subscriptions match the regions', async () => {
		(getIfDefined as jest.Mock).mockReturnValue('UK');

		const event = {
			discountExpiresOnDate: '2024-03-21',
			expiringDiscountsToProcess: testQueryResponse,
		};

		const result = await handler(event);

		expect(result).toBeDefined();
		expect(result.filteredSubs).toBeInstanceOf(Array);
		expect(result.filteredSubs.length).toBe(0);
	});

	it('should throw an error if FILTER_BY_REGIONS is not set', async () => {
		(getIfDefined as jest.Mock).mockImplementation(() => {
			throw new Error('FILTER_BY_REGIONS environment variable not set');
		});

		const event = {
			discountExpiresOnDate: '2024-03-21',
			expiringDiscountsToProcess: testQueryResponse,
		};

		await expect(handler(event)).rejects.toThrow(
			'FILTER_BY_REGIONS environment variable not set',
		);
	});
});
