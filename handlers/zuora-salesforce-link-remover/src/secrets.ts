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
				apiUserSecretName: 'PROD/Salesforce/User/BillingAccountRemoverAPIUser',
				connectedAppSecretName:
					'PROD/Salesforce/ConnectedApp/BillingAccountRemover',
			};
		default:
			return {
				apiUserSecretName: '',
				connectedAppSecretName: '',
			};
	}
}

export function getZuoraSecretName(stage: 'CODE' | 'PROD'): string {
	switch (stage) {
		case 'CODE':
			return 'CODE/Zuora-OAuth/SupportServiceLambdas';
		case 'PROD':
			return 'PROD/Zuora-OAuth/SupportServiceLambdas';
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

export type ZuoraSecret = {
	clientId: string;
	clientSecret: string;
};
