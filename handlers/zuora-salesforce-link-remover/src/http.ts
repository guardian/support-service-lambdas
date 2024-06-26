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
			throw new Error(await result.text());
		} else {
			console.log('successfully authenticated with Salesforce');
			return await result.json() as SfAuthResponse;
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

export async function executeSalesforceQuery(
	sfAuthResponse: SfAuthResponse,
	query: string,
): Promise<SalesforceQueryResponse> {
	//todo api version to env vars
	const response = await fetch(
		`${sfAuthResponse.instance_url}/services/data/v54.0/query?q=${encodeURIComponent(query)}`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${sfAuthResponse.access_token}`,
				'Content-Type': 'application/json',
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to execute query: ${response.statusText}`);
	}

	return await response.json() as SalesforceQueryResponse;
}

type SalesforceRecord = {
	Id: string;
	Name: string;
  };
  
  type SalesforceQueryResponse = {
	totalSize: number;
	done: boolean;
	records: SalesforceRecord[];
  };
