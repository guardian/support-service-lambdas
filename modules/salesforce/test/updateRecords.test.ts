import type { SalesforceUpdateResponse } from '../src/updateRecords';
import {
	doCompositeCallout,
	SalesforceUpdateResponseArraySchema,
} from '../src/updateRecords';
import { mockSfClient } from './mocks/mockSfClient';

global.fetch = jest.fn();

describe('doCompositeCallout', () => {
	const path = '/asdf';
	const body = [{ id: '001', name: 'Test' }];

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should make a PATCH request with the correct headers and body', async () => {
		const mockResponse: SalesforceUpdateResponse[] = [
			{ success: true, errors: [] },
		];
		mockSfClient.patch.mockResolvedValue(mockResponse);

		const result = await doCompositeCallout(mockSfClient, path, body);

		expect(mockSfClient.patch).toHaveBeenCalledWith(
			path,
			JSON.stringify(body),
			expect.anything(),
		);
		expect(result).toEqual(mockResponse);
	});

	it('should be able to parse a response', () => {
		const mockResponse: SalesforceUpdateResponse[] = [
			{ success: true, errors: [] },
		];
		const actual =
			SalesforceUpdateResponseArraySchema.safeParse(mockResponse).success;
		expect(actual).toEqual(true);
	});
});
