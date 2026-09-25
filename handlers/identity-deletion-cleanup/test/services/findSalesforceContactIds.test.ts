import { executeSalesforceQueryAll } from '@modules/salesforce/query';
import type { SfClient } from '@modules/salesforce/sfClient';
import { identityIdSchema } from '../../src/schemas/identityDeletionEventSchema';
import { findSalesforceContactIds } from '../../src/services/findSalesforceContactIds';

jest.mock('@modules/salesforce/query', () => ({
	executeSalesforceQueryAll: jest.fn(),
}));

const mockExecuteSalesforceQueryAll = jest.mocked(executeSalesforceQueryAll);

describe('findSalesforceContactIds', () => {
	const identityId = identityIdSchema.parse('1234567');

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('finds every matching Contact by Identity ID', async () => {
		mockExecuteSalesforceQueryAll.mockResolvedValue([{ Id: 'contact-1' }]);

		await expect(
			findSalesforceContactIds({} as SfClient, identityId),
		).resolves.toEqual(['contact-1']);

		expect(mockExecuteSalesforceQueryAll).toHaveBeenCalledWith(
			expect.anything(),
			"SELECT Id FROM Contact WHERE IdentityID__c = '1234567' LIMIT 2",
			expect.anything(),
		);
	});

	it('rejects more than one matching Contact', async () => {
		mockExecuteSalesforceQueryAll.mockResolvedValue(
			Array.from({ length: 2 }, () => ({ Id: 'contact' })),
		);

		await expect(
			findSalesforceContactIds({} as SfClient, identityId),
		).rejects.toThrow('Identity ID matched more than 1 Salesforce Contact');
	});
});
