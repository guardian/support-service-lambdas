import { getSSMParam } from '@modules/aws/ssm';
import { buildAuthClient, runQuery } from '@modules/bigquery/src/bigquery';
import { stageFromEnvironment } from '@modules/stage';
import { addDays, handler } from '../../src/handlers/getExpiringDiscounts';

jest.mock('@modules/aws/ssm');
jest.mock('@modules/bigquery/src/bigquery');
jest.mock('@modules/stage');

describe('getExpiringDiscounts handler', () => {
	const mockGcpConfig = { key: 'value' };
	const mockAuthClient = { client: 'authClient' };
	const mockQueryResult = [{ id: 1 }, { id: 2 }];

	beforeEach(() => {
		jest.resetAllMocks();
		(getSSMParam as jest.Mock).mockResolvedValue(mockGcpConfig);
		(buildAuthClient as jest.Mock).mockResolvedValue(mockAuthClient);
		(runQuery as jest.Mock).mockResolvedValue(mockQueryResult);
		(stageFromEnvironment as jest.Mock).mockReturnValue('test-stage');
		process.env.DAYS_UNTIL_DISCOUNT_EXPIRY_DATE = '32';
	});

	test('should return results when discountExpiresOnDate is provided', async () => {
		const event = { discountExpiresOnDate: '2025-11-23' };
		const result = await handler(event);

		expect(getSSMParam).toHaveBeenCalledWith(
			'gcp-credentials-config',
			'test-stage',
		);
		expect(buildAuthClient).toHaveBeenCalledWith(mockGcpConfig);
		expect(runQuery).toHaveBeenCalledWith(mockAuthClient, expect.any(String));
		expect(result).toEqual({
			discountExpiresOnDate: '2025-11-23',
			allRecordsFromBigQueryCount: 2,
			allRecordsFromBigQuery: mockQueryResult,
		});
	});

	test('should return results when discountExpiresOnDate is not provided', async () => {
		const event = {};
		const mockDate = new Date(2025, 10, 23);
		jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
		const result = await handler(event);

		expect(getSSMParam).toHaveBeenCalledWith(
			'gcp-credentials-config',
			'test-stage',
		);
		expect(buildAuthClient).toHaveBeenCalledWith(mockGcpConfig);
		expect(runQuery).toHaveBeenCalledWith(mockAuthClient, expect.any(String));
		expect(result).toEqual({
			discountExpiresOnDate: '2025-12-25',
			allRecordsFromBigQueryCount: 2,
			allRecordsFromBigQuery: mockQueryResult,
		});
	});

	test('should throw an error when an exception occurs', async () => {
		const event = { discountExpiresOnDate: '2025-11-23' };
		(runQuery as jest.Mock).mockRejectedValue(new Error('Query failed'));

		await expect(handler(event)).rejects.toThrow('Query failed');
	});
});

describe('addDays function', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});
	test('should add days to the given date', () => {
		const date = new Date('2025-11-23');
		const result = addDays(date, 10);
		expect(result).toBe('2025-12-03');
	});

	test('should handle leap year correctly', () => {
		const date = new Date('2024-02-28');
		const result = addDays(date, 1);
		expect(result).toBe('2024-02-29');
	});
});
