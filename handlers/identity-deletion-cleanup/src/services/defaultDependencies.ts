import { SfClient } from '@modules/salesforce/sfClient';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { SALESFORCE_CONNECTED_APP_SECRET_NAME } from '../constants';
import type { IdentityDeletionCleanupDependencies } from '../types/identityDeletionCleanup';
import { clearSalesforceContactIds } from './clearSalesforceContactIds';
import { clearZuoraAccountIds } from './clearZuoraAccountIds';
import { findSalesforceContactIds } from './findSalesforceContactIds';
import { findZuoraAccountIds } from './findZuoraAccountIds';

export async function defaultDependencies(): Promise<IdentityDeletionCleanupDependencies> {
	const stage = stageFromEnvironment();
	const [sfClient, zuoraClient] = await Promise.all([
		SfClient.createWithClientCredentials(
			`${stage}/${SALESFORCE_CONNECTED_APP_SECRET_NAME}`,
		),
		ZuoraClient.create(stage),
	]);

	return {
		findSalesforceContactIds: (identityId) =>
			findSalesforceContactIds(sfClient, identityId),
		clearSalesforceContactIds: (contactIds) =>
			clearSalesforceContactIds(sfClient, contactIds),
		findZuoraAccountIds: (identityId) =>
			findZuoraAccountIds(zuoraClient, identityId),
		clearZuoraAccountIds: (accountIds) =>
			clearZuoraAccountIds(zuoraClient, accountIds),
	};
}
