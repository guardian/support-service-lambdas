import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import { doSfAuth, updateSfBillingAccounts } from './salesforceHttp';
import type {
	SalesforceUpdateRecord,
	SfApiUserAuth,
	SfConnectedAppAuth,
} from './salesforceHttp';
import { getSalesforceSecretNames } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';

export async function handler() {
	const secretNames = getSalesforceSecretNames(stageFromEnvironment());

	const { authUrl, clientId, clientSecret } =
		await getSecretValue<ConnectedAppSecret>(
			secretNames.connectedAppSecretName,
		);

	const { username, password, token } = await getSecretValue<ApiUserSecret>(
		secretNames.apiUserSecretName,
	);

	const sfConnectedAppAuth: SfConnectedAppAuth = { clientId, clientSecret };
	const sfApiUserAuth: SfApiUserAuth = {
		url: authUrl,
		grant_type: 'password',
		username,
		password,
		token,
	};

	const sfAuthResponse = await doSfAuth(sfApiUserAuth, sfConnectedAppAuth);

	//mocked records to update will come from input event. Need to create state machine before we will know the exact format of the object.
	const mockedRecordsToUpdate: SalesforceUpdateRecord[] = [
		{
			id: 'a029E00000OEdL9QAL',
			GDPR_Removal_Attempts__c: 1,
			attributes: {
				type: 'Zuora__CustomerAccount__c',
			},
		},
		{
			id: 'a029E00000OEdMWQA1',
			GDPR_Removal_Attempts__c: 2,
			attributes: {
				type: 'Zuora__CustomerAccount__c',
			},
		},
	];

	const incrementedRecords = incrementRemovalAttempts(mockedRecordsToUpdate);
	const sfUpdateResponse = await updateSfBillingAccounts(
		sfAuthResponse,
		incrementedRecords,
	);

	return sfUpdateResponse;
}

function incrementRemovalAttempts(
	recordsToIncrement: SalesforceUpdateRecord[],
): SalesforceUpdateRecord[] {
	return recordsToIncrement.map((record) => ({
		...record,
		GDPR_Removal_Attempts__c: record.GDPR_Removal_Attempts__c + 1,
	}));
}
