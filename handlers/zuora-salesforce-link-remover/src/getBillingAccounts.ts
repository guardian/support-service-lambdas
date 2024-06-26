import { doSfAuth, executeSalesforceQuery } from './http';
import type {
	SalesforceQueryResponse,
	SfApiUserAuth,
	SfConnectedAppAuth,
} from './http';
import { getSecretValue } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';

export async function handler() {
	//TODO in future pr: add a module that returns obtains secrets depending on env
	const connectedAppSecretName =
		'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox';
	const apiUserSecretName = 'DEV/Salesforce/User/BillingAccountRemoverAPIUser';

	const connectedAppSecretValue = await getSecretValue<ConnectedAppSecret>(
		connectedAppSecretName,
	);
	const apiUserSecretValue =
		await getSecretValue<ApiUserSecret>(apiUserSecretName);

	const { authUrl, clientId, clientSecret } = connectedAppSecretValue;
	const { username, password, token } = apiUserSecretValue;

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
		'select Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c  from Zuora__CustomerAccount__c LIMIT 10';
	const response: SalesforceQueryResponse = await executeSalesforceQuery(
		sfAuthResponse,
		testQuery,
	);
	return response.records;
}
