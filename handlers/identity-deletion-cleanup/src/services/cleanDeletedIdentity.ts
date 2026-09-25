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

	const salesforceContactsCleared =
		await dependencies.clearSalesforceContactIds(salesforceContactIds);
	const zuoraAccountsCleared =
		await dependencies.clearZuoraAccountIds(zuoraAccountIds);

	return { salesforceContactsCleared, zuoraAccountsCleared };
}
