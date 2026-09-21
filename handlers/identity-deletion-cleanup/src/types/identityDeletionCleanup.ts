export type IdentityDeletionCleanupOutcome = {
	salesforceContactsCleared: number;
	zuoraAccountsCleared: number;
};

export type IdentityDeletionCleanupDependencies = {
	findSalesforceContactIds: (identityId: string) => Promise<string[]>;
	clearSalesforceContactIds: (contactIds: readonly string[]) => Promise<number>;
	findZuoraAccountIds: (identityId: string) => Promise<string[]>;
	clearZuoraAccountIds: (accountIds: readonly string[]) => Promise<number>;
};
