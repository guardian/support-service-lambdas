export async function doSfAuth(
	sfApiUserAuth: SfApiUserAuth,
	sfConnectedAppAuth: SfConnectedAppAuth,
): Promise<SfAuthResponse> {
	console.log('authenticating with Salesforce...');

	try {
		const options = {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: buildBody(sfApiUserAuth, sfConnectedAppAuth),
		};

		const result = await fetch(sfApiUserAuth.url, options);

		if (!result.ok) {
			const authResponseText = await result.text();
			throw new Error(authResponseText);
		} else {
			console.log('successfully authenticated with Salesforce');

			const authResponseJson = await result.json();
			return authResponseJson as SfAuthResponse;
		}
	} catch (error) {
		throw new Error(
			`error authenticating with Salesforce: ${JSON.stringify(error)}`,
		);
	}
}

function buildBody(
	sfApiUserAuth: SfApiUserAuth,
	sfConnectedAppAuth: SfConnectedAppAuth,
): string {
	return (
		`grant_type=password` +
		`&client_id=${sfConnectedAppAuth.clientId}` +
		`&client_secret=${sfConnectedAppAuth.clientSecret}` +
		`&username=${sfApiUserAuth.username}` +
		`&password=${sfApiUserAuth.password}${sfApiUserAuth.token}`
	);
}

export type SfAuthResponse = {
	access_token: string;
	instance_url: string;
};

export type SfConnectedAppAuth = {
	clientId: string;
	clientSecret: string;
};

export type SfApiUserAuth = {
	url: string;
	grant_type: string;
	username: string;
	password: string;
	token: string;
};

export async function executeSalesforceQuery(sfAuthResponse: SfAuthResponse) {
	const soql = 'select Id, name from Zuora__CustomerAccount__c LIMIT 10';

	const queryUrl = `${sfAuthResponse.instance_url}/services/data/v54.0/query?q=${encodeURIComponent(soql)}`;

	const response = await fetch(queryUrl, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${sfAuthResponse.access_token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to execute query: ${response.statusText}`);
	}

	return await response.json();
}
