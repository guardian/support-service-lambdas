import type { SalesforceUpdateResponse } from '../src/updateRecords';
import { doCompositeCallout } from '../src/updateRecords';

global.fetch = jest.fn();

describe('doCompositeCallout', () => {
	const url = 'https://example.com';
	const token = 'mockToken';
	const body = JSON.stringify([{ id: '001', name: 'Test' }]);

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should make a PATCH request with the correct headers and body', async () => {
		const mockResponse: SalesforceUpdateResponse[] = [
			{ success: true, errors: [] },
		];
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => await Promise.resolve(mockResponse),
		});

		const result = await doCompositeCallout(url, token, body);

		expect(fetch).toHaveBeenCalledWith(url, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body,
		});
		expect(result).toEqual(mockResponse);
	});

	it('should throw an error if the response is not ok', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: false,
			statusText: 'Not Found',
		});

		await expect(doCompositeCallout(url, token, body)).rejects.toThrow(
			'Error executing composite callout to Salesforce: Error updating record(s) in Salesforce: Not Found',
		);
	});

	it('should throw an error if the response parsing fails', async () => {
		const invalidResponse = { invalid: 'response' };
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => await Promise.resolve(invalidResponse),
		});

		await expect(doCompositeCallout(url, token, body)).rejects.toThrow(
			'Error parsing response from Salesforce',
		);
	});

	it('should throw an error if the fetch call fails', async () => {
		(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

		await expect(doCompositeCallout(url, token, body)).rejects.toThrow(
			'Error executing composite callout to Salesforce:',
		);
	});
});
