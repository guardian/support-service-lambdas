import { z } from 'zod';
import { mockZuoraClient } from '../../zuora/test/mocks/mockZuoraClient';
import {
	executeSalesforceQuery,
	executeSalesforceQueryAll,
} from '../src/query';
import { SalesforceQueryResponseSchema } from '../src/recordSchema';

global.fetch = jest.fn();

describe('executeSalesforceQuery', () => {
	const mockQuery = 'SELECT Id, Name FROM Account';
	const mockSchema = z.object({
		Id: z.string(),
		Name: z.string(),
	});

	const mockSuccessfulResponse = {
		totalSize: 1,
		done: true,
		records: [{ Id: '001', Name: 'Mock Account' }],
	};

	const mockInvalidResponse = {
		totalSize: 1,
		done: true,
		records: [{ Id: '001', Name: 123 }], // Invalid Name type
	};

	beforeEach(() => {
		jest.resetModules();
		(fetch as jest.MockedFunction<typeof fetch>).mockClear();
	});

	it('should execute query successfully and return parsed response', async () => {
		mockZuoraClient.get.mockResolvedValueOnce(mockSuccessfulResponse);

		const response = await executeSalesforceQuery(
			mockZuoraClient,
			mockQuery,
			mockSchema,
		);

		expect(response).toEqual(mockSuccessfulResponse);
	});

	it('parser should succeed on an valid response', () => {
		const actual = SalesforceQueryResponseSchema(mockSchema).safeParse(
			mockSuccessfulResponse,
		).success;
		expect(actual).toBe(true);
	});

	it('parser should fail on an invalid response', () => {
		const actual =
			SalesforceQueryResponseSchema(mockSchema).safeParse(
				mockInvalidResponse,
			).success;
		expect(actual).toBe(false);
	});

	it('should retrieve every page of a Salesforce query', async () => {
		mockZuoraClient.get
			.mockResolvedValueOnce({
				totalSize: 2,
				done: false,
				nextRecordsUrl: '/services/data/v59.0/query/next-page',
				records: [{ Id: '001', Name: 'First account' }],
			})
			.mockResolvedValueOnce({
				totalSize: 2,
				done: true,
				records: [{ Id: '002', Name: 'Second account' }],
			});

		await expect(
			executeSalesforceQueryAll(mockZuoraClient, mockQuery, mockSchema),
		).resolves.toEqual([
			{ Id: '001', Name: 'First account' },
			{ Id: '002', Name: 'Second account' },
		]);

		expect(mockZuoraClient.get).toHaveBeenLastCalledWith(
			'/services/data/v59.0/query/next-page',
			expect.anything(),
		);
	});

	it('should reject an incomplete Salesforce query without a next records URL', async () => {
		mockZuoraClient.get.mockResolvedValueOnce({
			totalSize: 2,
			done: false,
			records: [{ Id: '001', Name: 'First account' }],
		});

		await expect(
			executeSalesforceQueryAll(mockZuoraClient, mockQuery, mockSchema),
		).rejects.toThrow('Salesforce query response was incomplete');
	});
});
