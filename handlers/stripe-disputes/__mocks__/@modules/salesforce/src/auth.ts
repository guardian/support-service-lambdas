export type SfConnectedAppAuth = {
	clientId: string;
	clientSecret: string;
};

export type SfAuthResponse = {
	access_token: string;
	instance_url: string;
	id: string;
	token_type: string;
	issued_at: string;
	signature: string;
};

export async function doSfAuthClientCredentials(
	sfConnectedAppAuth: SfConnectedAppAuth,
	authUrl?: string,
): Promise<SfAuthResponse> {
	return {
		access_token: 'mock_access_token',
		instance_url: 'https://mock.salesforce.com',
		id: 'mock_id',
		token_type: 'Bearer',
		issued_at: '1234567890',
		signature: 'mock_signature',
	};
}
