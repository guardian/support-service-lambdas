import type { IdentityId } from '../schemas/identityDeletionEventSchema';
import type {
	IdentityDeletionCleanupDependencies,
	IdentityDeletionCleanupOutcome,
} from '../types/identityDeletionCleanup';

export async function cleanDeletedIdentity(
	identityId: IdentityId,
	dependencies: IdentityDeletionCleanupDependencies,
): Promise<IdentityDeletionCleanupOutcome> {
	const salesforceContactIds =
		await dependencies.findSalesforceContactIds(identityId);
	const zuoraAccountIds = await dependencies.findZuoraAccountIds(identityId);

	const [salesforceResult, zuoraResult] = await Promise.allSettled([
		dependencies.clearSalesforceContactIds(salesforceContactIds),
		dependencies.clearZuoraAccountIds(zuoraAccountIds),
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
