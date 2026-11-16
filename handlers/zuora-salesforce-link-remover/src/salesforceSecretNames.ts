import type { Stage } from '@modules/stage';

type SalesforceConnectedAppSecretName =
	`${Stage}/Salesforce/ConnectedApp/BillingAccountRemover`;

export function getSalesforceConnectedAppSecretName(
	stage: Stage,
): SalesforceConnectedAppSecretName {
	return `${stage}/Salesforce/ConnectedApp/BillingAccountRemover`;
}
