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

	it('cleans all Salesforce Contacts before all Zuora Customer Accounts', async () => {
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
			'clear Salesforce',
			'find Zuora',
			'clear Zuora',
		]);
	});

	it('stops and lets SQS retry when Salesforce cleanup fails', async () => {
		const findZuoraAccountIds = jest.fn().mockResolvedValue([]);
		const deps = dependencies({
			clearSalesforceContactIds: jest
				.fn()
				.mockRejectedValue(new Error('Salesforce unavailable')),
			findZuoraAccountIds,
		});

		await expect(cleanDeletedIdentity(identityId, deps)).rejects.toThrow(
			'Salesforce unavailable',
		);
		expect(findZuoraAccountIds).not.toHaveBeenCalled();
	});

	it('surfaces a Zuora failure after the idempotent Salesforce cleanup', async () => {
		const deps = dependencies({
			clearZuoraAccountIds: jest
				.fn()
				.mockRejectedValue(new Error('Zuora unavailable')),
		});

		await expect(cleanDeletedIdentity(identityId, deps)).rejects.toThrow(
			'Zuora unavailable',
		);
		expect(deps.clearSalesforceContactIds).toHaveBeenCalled();
	});
});
