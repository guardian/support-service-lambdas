import { identityIdSchema } from '../../src/schemas/identityDeletionEventSchema';
import { cleanDeletedIdentity } from '../../src/services/cleanDeletedIdentity';
import type { IdentityDeletionCleanupDependencies } from '../../src/types/identityDeletionCleanup';

const identityId = identityIdSchema.parse('1234567');

function dependencies(
	overrides: Partial<IdentityDeletionCleanupDependencies> = {},
): IdentityDeletionCleanupDependencies {
	return {
		findSalesforceContactIds: jest.fn().mockResolvedValue([]),
		clearSalesforceContactIds: jest.fn().mockResolvedValue(0),
		findZuoraAccountIds: jest.fn().mockResolvedValue([]),
		clearZuoraAccountIds: jest.fn().mockResolvedValue(0),
		...overrides,
	};
}

describe('cleanDeletedIdentity', () => {
	it('treats no Salesforce or Zuora matches as a successful no-op', async () => {
		await expect(
			cleanDeletedIdentity(identityId, dependencies()),
		).resolves.toEqual({
			salesforceContactsCleared: 0,
			zuoraAccountsCleared: 0,
		});
	});

	it('handles a duplicate delivery after the matching fields have been cleared', async () => {
		const deps = dependencies({
			findSalesforceContactIds: jest
				.fn()
				.mockResolvedValueOnce(['contact-1'])
				.mockResolvedValueOnce([]),
			clearSalesforceContactIds: jest
				.fn()
				.mockResolvedValueOnce(1)
				.mockResolvedValueOnce(0),
			findZuoraAccountIds: jest
				.fn()
				.mockResolvedValueOnce(['account-1'])
				.mockResolvedValueOnce([]),
			clearZuoraAccountIds: jest
				.fn()
				.mockResolvedValueOnce(1)
				.mockResolvedValueOnce(0),
		});

		await expect(cleanDeletedIdentity(identityId, deps)).resolves.toEqual({
			salesforceContactsCleared: 1,
			zuoraAccountsCleared: 1,
		});
		await expect(cleanDeletedIdentity(identityId, deps)).resolves.toEqual({
			salesforceContactsCleared: 0,
			zuoraAccountsCleared: 0,
		});
	});

	it.each(['findSalesforceContactIds', 'findZuoraAccountIds'] as const)(
		'rejects when %s fails',
		async (lookup) => {
			const deps = dependencies({
				[lookup]: jest
					.fn()
					.mockRejectedValue(new Error(`${lookup} unavailable`)),
			});

			await expect(cleanDeletedIdentity(identityId, deps)).rejects.toThrow(
				`${lookup} unavailable`,
			);
		},
	);

	it.each([
		{
			update: 'clearSalesforceContactIds',
			failure: 'Salesforce cleanup failed: unavailable',
		},
		{
			update: 'clearZuoraAccountIds',
			failure: 'Zuora cleanup failed: unavailable',
		},
	] as const)(
		'attempts both updates and rejects when $update fails',
		async ({ update, failure }) => {
			const deps = dependencies({
				[update]: jest.fn().mockRejectedValue(new Error('unavailable')),
			});

			await expect(cleanDeletedIdentity(identityId, deps)).rejects.toThrow(
				failure,
			);
			expect(deps.clearSalesforceContactIds).toHaveBeenCalled();
			expect(deps.clearZuoraAccountIds).toHaveBeenCalled();
		},
	);
});
