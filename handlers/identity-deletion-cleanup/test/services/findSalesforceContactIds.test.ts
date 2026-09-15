import { executeSalesforceQueryAll } from '@modules/salesforce/query';
import type { SfClient } from '@modules/salesforce/sfClient';
import { findSalesforceContactIds } from '../../src/services/findSalesforceContactIds';

jest.mock('@modules/salesforce/query', () => ({
	executeSalesforceQueryAll: jest.fn(),
}));

const mockExecuteSalesforceQueryAll = jest.mocked(executeSalesforceQueryAll);

describe('findSalesforceContactIds', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('finds every matching Contact by Identity ID', async () => {
		mockExecuteSalesforceQueryAll.mockResolvedValue([
			{ Id: 'contact-1' },
			{ Id: 'contact-2' },
		]);

		await expect(
			findSalesforceContactIds({} as SfClient, '1234567'),
		).resolves.toEqual(['contact-1', 'contact-2']);

		expect(mockExecuteSalesforceQueryAll).toHaveBeenCalledWith(
			expect.anything(),
			"SELECT Id FROM Contact WHERE IdentityID__c = '1234567'",
			expect.anything(),
		);
	});
});
