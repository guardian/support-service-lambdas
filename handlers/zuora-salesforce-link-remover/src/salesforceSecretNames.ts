import type { Stage } from '@modules/stage';

export function getSalesforceConnectedAppSecretName(stage: Stage): string {
	switch (stage) {
		case 'CODE':
			return 'CODE/Salesforce/ConnectedApp/BillingAccountRemover';
		case 'PROD':
			return 'PROD/Salesforce/ConnectedApp/BillingAccountRemover';
	}
}
