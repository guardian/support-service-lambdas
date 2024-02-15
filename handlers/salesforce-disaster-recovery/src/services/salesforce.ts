export interface SalesforceOauthCredentials {
	authorization_endpoint: string;
	client_id: string;
	client_secret: string;
	oauth_http_parameters: {
		body_parameters: Array<{ key: string; value: string }>;
	};
}

export const generateSalesforceAccessToken = async ({
	credentials,
}: {
	credentials: SalesforceOauthCredentials;
}) => {
	try {
		const formData = new URLSearchParams([
			['client_id', credentials.client_id],
			['client_secret', credentials.client_secret],
		]);

		credentials.oauth_http_parameters.body_parameters.forEach((param) => {
			formData.append(param.key, param.value);
		});

		const response = await fetch(credentials.authorization_endpoint, {
			method: 'POST',
			body: formData,
		});

		const json = (await response.json()) as { access_token: string };

		return json.access_token;
	} catch (error) {
		console.error(error);
		throw new Error('Failed to generate access token');
	}
};

export const getSalesforceQueryResult = async ({
	accessToken,
	queryJobId,
	apiDomain,
}: {
	accessToken: string;
	queryJobId: string;
	apiDomain: string;
}) => {
	try {
		const response = await fetch(
			`${apiDomain}/services/data/v59.0/jobs/query/${queryJobId}/results`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		const text = await response.text();

		return text;
	} catch (error) {
		console.error(error);
		throw new Error('Failed to get Salesforce query results');
	}
};
