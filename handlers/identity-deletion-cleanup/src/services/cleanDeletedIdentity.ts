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
	const salesforceContactsCleared =
		await dependencies.clearSalesforceContactIds(salesforceContactIds);

	const zuoraAccountIds = await dependencies.findZuoraAccountIds(identityId);
	const zuoraAccountsCleared =
		await dependencies.clearZuoraAccountIds(zuoraAccountIds);

	return { salesforceContactsCleared, zuoraAccountsCleared };
}
