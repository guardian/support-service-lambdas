import type { SecretNames } from '@modules/salesforce/secrets';
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
