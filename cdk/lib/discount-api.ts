import type { App } from 'aws-cdk-lib';
import { CfnOutput, SecretValue } from 'aws-cdk-lib';
import {
	ProviderAttribute,
	UserPool,
	UserPoolClient,
	UserPoolClientIdentityProvider,
	UserPoolDomain,
	UserPoolIdentityProviderGoogle,
} from 'aws-cdk-lib/aws-cognito';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import {
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
	ReadRepoConfig,
} from './cdk/policies';
import { SrApiLambda } from './cdk/sr-api-lambda';
import { domainForStack } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

// CDK and handler have to match these values
export const docsPath = 'docs';

export class DiscountApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'discount-api' });

		const nameWithStage = `${this.app}-${stage}`;
		const ssmConfigBase = `/${this.stage}/support-service-lambdas/`;

		const googleOAuthClientId = StringParameter.fromStringParameterName(
			this,
			'GoogleOAuthClientId',
			ssmConfigBase + 'googleOAuthClientId',
		).stringValue;

		// should be a secret parameter - need to check with devx
		const googleOAuthClientSecret = StringParameter.fromStringParameterName(
			this,
			'GoogleOAuthClientSecret',
			ssmConfigBase + 'googleOAuthClientSecret',
		).stringValue;

		const userPool = new UserPool(this, 'DiscountApiUserPool', {
			userPoolName: nameWithStage,
			signInAliases: {
				email: true,
			},
		});

		const userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
			userPool,
			cognitoDomain: {
				domainPrefix: 'gu-' + this.app + '-' + this.stage.toLowerCase(), // must be unique
				// creates https://${domainPrefix}.auth.${region}.amazoncognito.com.
			},
		});

		const googleProvider = new UserPoolIdentityProviderGoogle(
			this,
			'GoogleProvider',
			{
				userPool,
				clientId: googleOAuthClientId,
				// CFN doesn't support secret values https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html#template-parameters-dynamic-patterns-resources
				// and using AwsCustomResource to read it also doesn't work as it seems to not find the built in lambda to implement it
				clientSecretValue: SecretValue.unsafePlainText(googleOAuthClientSecret),
				scopes: ['email'],
				attributeMapping: {
					email: ProviderAttribute.GOOGLE_EMAIL,
				},
			},
		);

		const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
			userPool,
			generateSecret: true, // you have to manually write to SSM so the lambda can read it
			oAuth: {
				// flows: {
				// 	authorizationCodeGrant: true,
				// },
				// scopes: [OAuthScope.EMAIL, OAuthScope.PROFILE, OAuthScope.OPENID],
				callbackUrls: [
					`https://${domainForStack(this).domainName}/withRedirect`,
				], // handles final authentication - ?code=[auth code]
				// need to POST to userPoolDomain's url/oauth2/token to verify
				// see https://aws-cdk.com/cognito-google#:~:text=exchange%20it%20for%20long%2Dlived%20Cognito%20credentials
			},
			supportedIdentityProviders: [UserPoolClientIdentityProvider.GOOGLE],
		});

		userPoolClient.node.addDependency(googleProvider);

		const lambda = new SrApiLambda(this, {
			lambdaOverrides: {
				description:
					'A lambda that enables the addition of discounts to existing subscriptions',
				environment: {
					COGNITO_USER_POOL_ID: userPool.userPoolId,
					COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
					COGNITO_DOMAIN: userPoolDomain.domainName,
				},
			},
			errorImpact:
				'an eligible user may not have been offered a discount during the cancellation flow',
		});

		lambda.addPolicies(
			new AllowS3CatalogReadPolicy(this),
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(this, `braze-emails`),
			new ReadRepoConfig(this),
		);

		// TODO: delete comment - Add Cognito authorizer to lambda
		lambda.addCognitoAuthorizer(userPool);

		// TODO: delete comment - Add protected path for docs with Cognito auth
		lambda.addStaffPath(docsPath);
	}
}
