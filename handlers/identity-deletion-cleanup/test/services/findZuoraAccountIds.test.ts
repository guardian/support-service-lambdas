import { objectQuery } from '@modules/zuora/objectQuery';
import { MAXIMUM_MATCHING_RECORDS_PER_IDENTITY } from '../../src/constants';
import { identityIdSchema } from '../../src/schemas/identityDeletionEventSchema';
import { findZuoraAccountIds } from '../../src/services/findZuoraAccountIds';

jest.mock('@modules/zuora/objectQuery', () => ({
	objectQuery: {
		accounts: {
			execute: jest.fn(),
		},
	},
}));

describe('findZuoraAccountIds', () => {
	const zuoraClient = {} as never;
	const identityId = identityIdSchema.parse('1234567');
	// eslint-disable-next-line @typescript-eslint/unbound-method -- mocked query builder method does not access `this`
	const mockExecute = jest.mocked(objectQuery.accounts.execute);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('finds matching Customer Accounts with the typed object query', async () => {
		mockExecute.mockResolvedValue({
			nextPage: null,
			data: [{ id: 'account-1' }, { id: 'account-2' }],
		});

		await expect(findZuoraAccountIds(zuoraClient, identityId)).resolves.toEqual(
			['account-1', 'account-2'],
		);

		expect(mockExecute).toHaveBeenCalledWith(
			zuoraClient,
			['id'],
			[],
			[{ field: 'IdentityId__c', operator: 'EQ', value: identityId }],
			MAXIMUM_MATCHING_RECORDS_PER_IDENTITY + 1,
		);
	});

	it('fails before clearing an unexpectedly large number of Customer Accounts', async () => {
		mockExecute.mockResolvedValue({
			nextPage: 'next-page',
			data: Array.from(
				{ length: MAXIMUM_MATCHING_RECORDS_PER_IDENTITY + 1 },
				(_, index) => ({ id: `account-${index}` }),
			),
		});

		await expect(findZuoraAccountIds(zuoraClient, identityId)).rejects.toThrow(
			'Identity ID matched more than 10 Zuora Accounts',
		);
	});
});
