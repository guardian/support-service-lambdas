import type { Stage } from '@modules/stage';

export function getSalesforceSecretNames(stage: Stage): SecretNames {
	switch (stage) {
		case 'CODE':
			return {
				apiUserSecretName: 'DEV/Salesforce/User/integrationapiuser',
				connectedAppSecretName:
					'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox',
			};
		case 'PROD':
			return {
				apiUserSecretName:
					'PROD/Salesforce/User/NegativeInvoiceProcessorAPIUser',
				connectedAppSecretName:
					'PROD/Salesforce/ConnectedApp/NegativeInvoiceProcessor',
			};
		default:
			return {
				apiUserSecretName: '',
				connectedAppSecretName: '',
			};
	}
}

export type SecretNames = {
	apiUserSecretName: string;
	connectedAppSecretName: string;
};

export type ConnectedAppSecret = {
	name: string;
	authUrl: string;
	clientId: string;
	clientSecret: string;
};

export type ApiUserSecret = {
	username: string;
	password: string;
	token: string;
};
