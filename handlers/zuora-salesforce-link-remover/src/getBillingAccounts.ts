import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import { doSfAuth, executeSalesforceQuery } from './salesforceHttp';
import type {
	SalesforceQueryResponse,
	SfApiUserAuth,
	SfConnectedAppAuth,
} from './salesforceHttp';
import { getSalesforceSecretNames } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';
import { updateBillingAccountInZuora } from './zuoraHttp';

export async function handler() {
	const zuoraBillingAccountUpdateResponse: ZuoraSuccessResponse =
		await updateBillingAccountInZuora('');
	console.log(zuoraBillingAccountUpdateResponse);
	const stage = process.env.STAGE;

	if (!stage) {
		throw Error('Stage not defined');
	}

	if (!isValidStage(stage)) {
		throw Error('Invalid stage value');
	}

	const secretNames = getSalesforceSecretNames(stage);

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

	//todo use test query for now, but update to prod query before release
	//todo generate test data when we get to dev for updating zuora billing accounts
	// const limit = 200;
	// const prodQuery = `SELECT Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c FROM Zuora__CustomerAccount__c WHERE Zuora__External_Id__c != null AND Zuora__Account__r.GDPR_Billing_Accounts_Ready_for_Removal__c = true AND GDPR_Removal_Attempts__c < $maxAttempts ORDER BY Zuora__Account__r.GDPR_Date_Successfully_Removed_Related__c desc LIMIT $limit`

	const testQuery =
		'select Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c from Zuora__CustomerAccount__c LIMIT 10';
	const response: SalesforceQueryResponse = await executeSalesforceQuery(
		sfAuthResponse,
		testQuery,
	);
	return response.records;
}

function isValidStage(value: unknown): value is 'CODE' | 'PROD' {
	return value === 'CODE' || value === 'PROD';
}
