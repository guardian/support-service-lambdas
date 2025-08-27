import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';
import { executeZoqlQuery } from '../../src/helpers/execute-zoql-query';

describe('executeZoqlQuery', () => {
	const mockZuoraClient: ZuoraClient = {
		post: jest.fn(),
	} as any;

	const testSchema = z.object({
		data: z.string(),
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should execute ZOQL query and return parsed response', async () => {
		const expectedResponse = { data: 'test result' };
		(mockZuoraClient.post as jest.Mock).mockResolvedValue(expectedResponse);

		const result = await executeZoqlQuery(
			'SELECT Id FROM Invoice',
			mockZuoraClient,
			testSchema,
		);

		expect(mockZuoraClient.post).toHaveBeenCalledWith(
			'/v1/action/query',
			JSON.stringify({
				queryString: 'SELECT Id FROM Invoice',
			}),
			testSchema,
		);

		expect(result).toEqual(expectedResponse);
	});

	it('should handle complex ZOQL queries', async () => {
		const expectedResponse = { data: 'complex result' };
		(mockZuoraClient.post as jest.Mock).mockResolvedValue(expectedResponse);

		const complexQuery = `SELECT Id, Name FROM Invoice WHERE Status = 'Active' AND Amount > 100`;

		const result = await executeZoqlQuery(
			complexQuery,
			mockZuoraClient,
			testSchema,
		);

		expect(mockZuoraClient.post).toHaveBeenCalledWith(
			'/v1/action/query',
			JSON.stringify({
				queryString: complexQuery,
			}),
			testSchema,
		);

		expect(result).toEqual(expectedResponse);
	});
});
