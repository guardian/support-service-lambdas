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

	it('finds both systems before updating either one', async () => {
		const calls: string[] = [];
		const deps = dependencies({
			findSalesforceContactIds: jest.fn(() => {
				calls.push('find Salesforce');
				return Promise.resolve(['contact-1', 'contact-2']);
			}),
			clearSalesforceContactIds: jest.fn(() => {
				calls.push('clear Salesforce');
				return Promise.resolve(2);
			}),
			findZuoraAccountIds: jest.fn(() => {
				calls.push('find Zuora');
				return Promise.resolve(['account-1']);
			}),
			clearZuoraAccountIds: jest.fn(() => {
				calls.push('clear Zuora');
				return Promise.resolve(1);
			}),
		});

		await expect(cleanDeletedIdentity(identityId, deps)).resolves.toEqual({
			salesforceContactsCleared: 2,
			zuoraAccountsCleared: 1,
		});
		expect(calls).toEqual([
			'find Salesforce',
			'find Zuora',
			'clear Salesforce',
			'clear Zuora',
		]);
	});

	it('does not update Salesforce when the Zuora lookup fails', async () => {
		const clearSalesforceContactIds = jest.fn();
		const deps = dependencies({
			findSalesforceContactIds: jest.fn().mockResolvedValue(['contact-1']),
			findZuoraAccountIds: jest
				.fn()
				.mockRejectedValue(new Error('Too many Zuora accounts')),
			clearSalesforceContactIds,
		});

		await expect(cleanDeletedIdentity(identityId, deps)).rejects.toThrow(
			'Too many Zuora accounts',
		);
		expect(clearSalesforceContactIds).not.toHaveBeenCalled();
		expect(deps.clearZuoraAccountIds).not.toHaveBeenCalled();
	});

	it('still attempts Zuora cleanup when Salesforce cleanup fails', async () => {
		const findZuoraAccountIds = jest.fn().mockResolvedValue([]);
		const clearZuoraAccountIds = jest.fn().mockResolvedValue(0);
		const deps = dependencies({
			clearSalesforceContactIds: jest
				.fn()
				.mockRejectedValue(new Error('Salesforce unavailable')),
			findZuoraAccountIds,
			clearZuoraAccountIds,
		});

		await expect(cleanDeletedIdentity(identityId, deps)).rejects.toThrow(
			'Salesforce cleanup failed: Salesforce unavailable',
		);
		expect(findZuoraAccountIds).toHaveBeenCalled();
		expect(clearZuoraAccountIds).toHaveBeenCalledWith([]);
	});

	it('surfaces a Zuora failure after attempting both cleanups', async () => {
		const deps = dependencies({
			clearZuoraAccountIds: jest
				.fn()
				.mockRejectedValue(new Error('Zuora unavailable')),
		});

		await expect(cleanDeletedIdentity(identityId, deps)).rejects.toThrow(
			'Zuora cleanup failed: Zuora unavailable',
		);
		expect(deps.clearSalesforceContactIds).toHaveBeenCalled();
		expect(deps.clearZuoraAccountIds).toHaveBeenCalled();
	});
});
