import type { IdentityId } from '../schemas/identityDeletionEventSchema';

export type IdentityDeletionCleanupOutcome = {
	salesforceContactsCleared: number;
	zuoraAccountsCleared: number;
};

export type IdentityDeletionCleanupDependencies = {
	findSalesforceContactIds: (identityId: IdentityId) => Promise<string[]>;
	clearSalesforceContactIds: (contactIds: readonly string[]) => Promise<number>;
	findZuoraAccountIds: (identityId: IdentityId) => Promise<string[]>;
	clearZuoraAccountIds: (accountIds: readonly string[]) => Promise<number>;
};
