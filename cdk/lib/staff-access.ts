import type { App } from 'aws-cdk-lib';
import { CfnOutput, RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import {
	ProviderAttribute,
	UserPool,
	UserPoolClient,
	UserPoolClientIdentityProvider,
	UserPoolDomain,
	UserPoolIdentityProviderGoogle,
} from 'aws-cdk-lib/aws-cognito';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrAppConfigKey } from './cdk/SrAppConfigKey';
import { domainForStack } from './cdk/SrRestDomain';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class StaffAccess extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'staff-access' });

		const nameWithStage = `${this.app}-${stage}`;

		const googleOAuthClientId = new SrAppConfigKey(
			this,
			'googleOAuthClientId',
			'oauth for staff only access, set up in https://console.cloud.google.com/apis/credentials',
		).valueAsString;

		// should be a secret parameter - need to check with devx
		const googleOAuthClientSecret = new SrAppConfigKey(
			this,
			'googleOAuthClientSecret',
		).valueAsString;

		const userPool = new UserPool(this, 'UserPool', {
			userPoolName: nameWithStage,
			signInAliases: {
				email: true,
			},
		});
		// by default it will keep the pool, but ours is repopulated from google auth anyway
		userPool.applyRemovalPolicy(RemovalPolicy.DESTROY);

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
					// this is where cognito is prepared to redirect browsers after oauth
					`https://${domainForStack(this).domainName}/oauth2callback`,
				], // handles final authentication - ?code=[auth code]
				// need to POST to userPoolDomain's url/oauth2/token to verify
				// see https://aws-cdk.com/cognito-google#:~:text=exchange%20it%20for%20long%2Dlived%20Cognito%20credentials
			},
			supportedIdentityProviders: [UserPoolClientIdentityProvider.GOOGLE],
		});

		userPoolClient.node.addDependency(googleProvider);

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'Allows staff to access private resources served directly by our APIs',
				environment: {
					COGNITO_USER_POOL_ID: userPool.userPoolId,
					COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
					COGNITO_DOMAIN: userPoolDomain.domainName,
				},
			},
			monitoring: {
				errorImpact:
					'staff are getting errors when viewing docs served by our API layer',
			},
			proxy: false,
		});

		// keep path variables in step with app code
		lambda.api.root
			.addResource('{targetApp}')
			.addResource('{targetPath+}')
			.addMethod('GET', undefined, { apiKeyRequired: false });

		lambda.api.root
			.addResource('oauth2callback')
			.addMethod('GET', undefined, { apiKeyRequired: false });
		lambda.api.root
			.resourceForPath('/auth/login')
			.addMethod('GET', undefined, { apiKeyRequired: false });
		lambda.api.root
			.resourceForPath('/auth/token')
			.addMethod('GET', undefined, { apiKeyRequired: false });

		// TODO: delete comment - Add protected path for docs with Cognito auth
		// lambda.addStaffPath(docsPath);
		new CfnOutput(this, 'UserPoolId', {
			value: userPool.userPoolId,
			exportName: `UserPoolId-${stage}`,
		});
	}
}
