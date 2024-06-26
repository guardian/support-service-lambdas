import { doSfAuth, executeSalesforceQuery } from './http';
import type { SfApiUserAuth, SfConnectedAppAuth } from './http';
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
	const query = 'select Id, name from Zuora__CustomerAccount__c LIMIT 10';
	const response = await executeSalesforceQuery(sfAuthResponse, query);
	console.log('query response: ', response);
	return;
}
