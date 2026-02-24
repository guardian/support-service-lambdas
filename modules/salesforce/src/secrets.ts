export type SecretNames = {
	apiUserSecretName: string;
	connectedAppSecretName: string;
};

export type ConnectedAppSecret = {
	authUrl: string;
	clientId: string;
	clientSecret: string;
};

export type ApiUserSecret = {
	username: string;
	password: string;
	token: string;
};
