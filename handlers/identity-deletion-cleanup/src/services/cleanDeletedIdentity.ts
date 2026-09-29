import type { IdentityId } from '../schemas/identityDeletionEventSchema';
import type {
	IdentityDeletionCleanupDependencies,
	IdentityDeletionCleanupOutcome,
} from '../types/identityDeletionCleanup';

export async function cleanDeletedIdentity(
	identityId: IdentityId,
	dependencies: IdentityDeletionCleanupDependencies,
): Promise<IdentityDeletionCleanupOutcome> {
	const [salesforceResult, zuoraResult] = await Promise.allSettled([
		(async () => {
			const contactIds =
				await dependencies.findSalesforceContactIds(identityId);
			return dependencies.clearSalesforceContactIds(contactIds);
		})(),
		(async () => {
			const accountIds = await dependencies.findZuoraAccountIds(identityId);
			return dependencies.clearZuoraAccountIds(accountIds);
		})(),
	]);

	if (
		salesforceResult.status === 'rejected' ||
		zuoraResult.status === 'rejected'
	) {
		const failures = [
			salesforceResult.status === 'rejected'
				? `Salesforce cleanup failed: ${errorMessage(salesforceResult.reason)}`
				: undefined,
			zuoraResult.status === 'rejected'
				? `Zuora cleanup failed: ${errorMessage(zuoraResult.reason)}`
				: undefined,
		].filter((failure): failure is string => failure !== undefined);

		throw new Error(failures.join('; '));
	}

	return {
		salesforceContactsCleared: salesforceResult.value,
		zuoraAccountsCleared: zuoraResult.value,
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
