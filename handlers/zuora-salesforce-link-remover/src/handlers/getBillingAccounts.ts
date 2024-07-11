import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
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
		
		const stage = process.env.STAGE;

		if (!stage) {
			throw Error('Stage not defined');
		}

		if (!isValidStage(stage)) {
			throw Error('Invalid Stage value');
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
			"select Id, GDPR_Removal_Attempts__c, Zuora__External_Id__c from Zuora__CustomerAccount__c where name like 'unlink account.testing%'  and GDPR_Removal_Attempts__c = 0 order by createddate asc LIMIT 2";
		const response: SalesforceQueryResponse = await executeSalesforceQuery(
			sfAuthResponse,
			testQuery,
		);
		console.log('response:', response);
		// throw new Error(`Testing error throwing`);

		return {
			billingAccountsToProcess: response.records,
		};
	}catch(error){
		throw new Error(`Error fetching billing accounts from Salesforce: ${JSON.stringify(error)}`);
	}
}

function isValidStage(value: unknown): value is 'CODE' | 'PROD' {
	return value === 'CODE' || value === 'PROD';
}