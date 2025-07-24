import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import { z } from 'zod';
import { doQuery } from '../src/query';

jest.mock('@modules/zuora/zuoraClient');

describe('doQuery', () => {
	const mockQuery = 'SELECT Id, Name FROM Account';
	const mockSchema = z.object({
		Id: z.string(),
		Name: z.string(),
	});

	const mockSuccessfulResponse = {
		Id: '001',
		Name: 'Mock Account',
	};

	it('should execute query successfully and return parsed response', async () => {
		mockZuoraClient.post = jest.fn().mockResolvedValue(mockSuccessfulResponse);

		const response = await doQuery(mockZuoraClient, mockQuery, mockSchema);

		expect(response).toEqual(mockSuccessfulResponse);
		expect(mockZuoraClient.post).toHaveBeenCalledWith(
			'/v1/action/query',
			JSON.stringify({ queryString: mockQuery }),
			mockSchema,
		);
	});

	it('should handle different schema types', async () => {
		const complexSchema = z.object({
			Id: z.string(),
			Amount: z.number(),
			CreatedDate: z.string(),
			IsActive: z.boolean(),
		});
		const complexResponse = {
			Id: 'inv123',
			Amount: 99.99,
			CreatedDate: '2023-01-01',
			IsActive: true,
		};

		mockZuoraClient.post.mockResolvedValueOnce(complexResponse);

		const response = await doQuery(mockZuoraClient, mockQuery, complexSchema);

		expect(response).toEqual(complexResponse);
	});

	it('should throw an error if the zuora client throws an error', async () => {
		const errorMessage = 'Zuora API error';
		mockZuoraClient.post.mockRejectedValueOnce(new Error(errorMessage));

		await expect(
			doQuery(mockZuoraClient, mockQuery, mockSchema),
		).rejects.toThrow(errorMessage);
	});

	it('should pass through schema validation errors from zuora client', async () => {
		const validationError = new Error('Schema validation failed');
		mockZuoraClient.post.mockRejectedValueOnce(validationError);

		await expect(
			doQuery(mockZuoraClient, mockQuery, mockSchema),
		).rejects.toThrow('Schema validation failed');
	});
});
