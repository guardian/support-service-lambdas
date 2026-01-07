import type { App } from 'aws-cdk-lib';
import {
	AllowGetSecretValuePolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

/**
 * CDK Stack for the Identity Sync Lambda.
 *
 * This Lambda syncs Identity IDs to:
 * - Zuora Account (IdentityId__c field)
 * - Salesforce Contact (IdentityID__c field)
 * - SupporterProductData DynamoDB (via SQS)
 *
 * Used to fix subscriptions missing their Identity ID linkage.
 */
export class IdentitySync extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'identity-sync' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			legacyId: `${this.app}-lambda`,
			lambdaOverrides: {
				description:
					'A lambda that syncs Identity IDs to Zuora, Salesforce, and SupporterProductData',
			},
			monitoring: {
				errorImpact:
					'a subscription may not have its Identity ID synced, preventing customer access to MMA and digital entitlements',
			},
		});

		lambda.addPolicies(
			// Zuora OAuth credentials
			new AllowZuoraOAuthSecretsPolicy(this),

			// SupporterProductData SQS queue
			AllowSqsSendPolicy.create(this, 'supporter-product-data'),

			// Salesforce credentials (CODE uses DEV secrets, PROD uses PROD secrets)
			new AllowGetSecretValuePolicy(
				this,
				'Salesforce User Secret policy',
				stage === 'CODE'
					? 'DEV/Salesforce/User/integrationapiuser-*'
					: 'PROD/Salesforce/User/BillingAccountRemoverAPIUser-*',
			),
			new AllowGetSecretValuePolicy(
				this,
				'Salesforce ConnectedApp Secret policy',
				stage === 'CODE'
					? 'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox-*'
					: 'PROD/Salesforce/ConnectedApp/BillingAccountRemover-*',
			),
		);
	}
}
