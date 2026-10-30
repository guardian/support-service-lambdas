import { executeSalesforceQuery } from '@modules/salesforce/query';
import type { SfClient } from '@modules/salesforce/sfClient';
import { doCompositeCallout } from '@modules/salesforce/updateRecords';
import { handler as getBillingAccounts } from '../src/handlers/getBillingAccounts';
import { handler as updateSfBillingAccounts } from '../src/handlers/updateSfBillingAccounts';

const createWithClientCredentials = jest.fn();
jest.mock('@modules/salesforce/query');
jest.mock('@modules/salesforce/updateRecords');
jest.mock('@modules/salesforce/sfClient', () => ({
	SfClient: {
		createWithClientCredentials: (...args: unknown[]): Promise<SfClient> =>
			createWithClientCredentials(...args) as Promise<SfClient>,
	},
}));

const sfClient = {} as SfClient;
const mockedExecuteSalesforceQuery = jest.mocked(executeSalesforceQuery);
const mockedDoCompositeCallout = jest.mocked(doCompositeCallout);

describe('Salesforce authentication', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.STAGE = 'CODE';
		createWithClientCredentials.mockResolvedValue(sfClient);
	});

	test('getBillingAccounts uses the CODE connected app', async () => {
		mockedExecuteSalesforceQuery.mockResolvedValue({
			totalSize: 0,
			done: true,
			records: [],
		});

		await getBillingAccounts();

		expect(createWithClientCredentials).toHaveBeenCalledWith(
			'CODE/Salesforce/ConnectedApp/BillingAccountRemover',
		);
	});

	test('updateSfBillingAccounts uses the CODE connected app', async () => {
		mockedDoCompositeCallout.mockResolvedValue([]);

		await updateSfBillingAccounts(
			[
				{
					attributes: { type: 'Zuora__CustomerAccount__c' },
					Id: 'billing-account-id',
					GDPR_Removal_Attempts__c: 1,
					Zuora__External_Id__c: 'zuora-account-id',
				},
			],
			{} as never,
			{} as never,
		);

		expect(createWithClientCredentials).toHaveBeenCalledWith(
			'CODE/Salesforce/ConnectedApp/BillingAccountRemover',
		);
	});
});
