import type { App } from 'aws-cdk-lib';
import { Fn } from 'aws-cdk-lib';
import { CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import {
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

// CDK and handler have to match these values
export const docsPath = 'docs';

export class DiscountApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'discount-api' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			legacyId: `${this.app}-lambda`,
			lambdaOverrides: {
				description:
					'A lambda that enables the addition of discounts to existing subscriptions',
			},
			monitoring: {
				errorImpact:
					'an eligible user may not have been offered a discount during the cancellation flow',
			},
		});

		lambda.addPolicies(
			new AllowS3CatalogReadPolicy(this),
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(this, `braze-emails`),
		);

		const userPoolId = Fn.importValue(`UserPoolId-${stage}`);

		const userPool = UserPool.fromUserPoolId(
			this,
			'ImportedUserPool',
			userPoolId,
		);

		const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(
			this,
			'CognitoAuthorizer',
			{
				cognitoUserPools: [userPool],
			},
		);
		lambda.addStaffPath(docsPath, cognitoAuthorizer);
	}
}
