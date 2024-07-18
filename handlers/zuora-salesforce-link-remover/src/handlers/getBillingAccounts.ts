import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import { doSfAuth, executeSalesforceQuery } from '../salesforceHttp';
import type {
	SalesforceQueryResponse,
	SfApiUserAuth,
	SfConnectedAppAuth,
} from '../salesforceHttp';
import { getSalesforceSecretNames } from '../secrets';
import type { ApiUserSecret, ConnectedAppSecret } from '../secrets';

export async function handler() {
	try{

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

		const limit = 200;
		const query = `SELECT Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c FROM Zuora__CustomerAccount__c WHERE Zuora__External_Id__c != null AND Zuora__Account__r.GDPR_Billing_Accounts_Ready_for_Removal__c = true AND GDPR_Removal_Attempts__c < 5 ORDER BY Zuora__Account__r.GDPR_Date_Successfully_Removed_Related__c desc LIMIT ${limit}`
		console.log('query:',query);
		const response: SalesforceQueryResponse = await executeSalesforceQuery(
			sfAuthResponse,
			query,
		);

		return {
			billingAccountsToProcess: response.records,
		};
	}catch(error){
		throw new Error(`Error fetching billing accounts from Salesforce: ${JSON.stringify(error)}`);
	}
}