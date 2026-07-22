import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuDeveloperPolicyExperimental } from '@guardian/cdk/lib/experimental/constructs/iam/policies';
import { type App } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class IamPolicies extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'iam-policies', stage });

		const friendlyName =
			'Local Development' +
			(stage === 'PROD' ? '' : ` ${stage} (for testing the policy itself)`);

		new GuDeveloperPolicyExperimental(this, 'LocalDevelopmentPolicy', {
			friendlyName,
			grantId: `membership-local-dev`,
			withoutPolicyChecks: true,
			statements: [
				new AllowS3GetPolicy('gu-reader-revenue-private', [
					'*/DEV/*',
					'*/CODE/*',
				]),
				new AllowCodeParameterStoreReadPolicy(this),
				new AllowCodeSecretsManagerReadPolicy(this),
				new AllowS3GetPolicy('gu-zuora-catalog', [`PROD/Zuora-CODE/*`]),
				getSupportAdminConsoleBucketPolicy(),
				new AllowDynamoTableFullAccessPolicy(this),
				...getManageFrontendPolicies(this.region, this.account),
				new PolicyStatement({
					actions: ['cloudwatch:PutMetricData'],
					resources: ['*'],
				}),
			],
		});
	}
}

class AllowS3GetPolicy extends PolicyStatement {
	constructor(bucketName: string, paths: string[]) {
		super({
			actions: ['s3:GetObject'],
			resources: paths.map((path) => `arn:aws:s3:::${bucketName}/${path}`),
		});
	}
}

class AllowCodeParameterStoreReadPolicy extends PolicyStatement {
	constructor(scope: GuStack) {
		super({
			actions: ['ssm:GetParameters', 'ssm:GetParameter'],
			resources: [
				`arn:aws:ssm:${scope.region}:${scope.account}:parameter/DEV/*`,
				`arn:aws:ssm:${scope.region}:${scope.account}:parameter/CODE/*`,
			],
		});
	}
}

class AllowCodeSecretsManagerReadPolicy extends PolicyStatement {
	constructor(scope: GuStack) {
		super({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [
				`arn:aws:secretsmanager:${scope.region}:${scope.account}:secret:DEV/*`,
				`arn:aws:secretsmanager:${scope.region}:${scope.account}:secret:CODE/*`,
			],
		});
	}
}

class AllowDynamoTableFullAccessPolicy extends PolicyStatement {
	constructor(scope: GuStack) {
		super({
			actions: [
				'BatchGetItem',
				'GetItem',
				'Scan',
				'Query',
				'GetRecords',
				'BatchWriteItem',
				'PutItem',
				'DeleteItem',
				'UpdateItem',
			].map((a) => `dynamodb:${a}`),
			resources: [
				`arn:aws:dynamodb:${scope.region}:${scope.account}:table/*-DEV`,
				`arn:aws:dynamodb:${scope.region}:${scope.account}:table/*-DEV/index/*`,
				`arn:aws:dynamodb:${scope.region}:${scope.account}:table/*-CODE`,
				`arn:aws:dynamodb:${scope.region}:${scope.account}:table/*-CODE/index/*`,
			],
		});
	}
}

/*
manage-frontend policies
from https://github.com/guardian/manage-frontend/blob/820a3d691173a21b6fd40ad47e02930b1198b21f/cdk/lib/manage-frontend.ts#L119
*/
function getManageFrontendPolicies(region: string, account: string) {
	const fulfilmentDatesBucketPolicy = new AllowS3GetPolicy(
		'fulfilment-date-calculator-code',
		['*'],
	);

	const allowListStackResources = new PolicyStatement({
		actions: ['cloudformation:ListStackResources'],
		resources: [
			`arn:aws:cloudformation:${region}:${account}:stack/membership-CODE-*`,
			`arn:aws:cloudformation:${region}:${account}:stack/support-CODE-*`,
		],
	});
	const unsafeAllowGetAllApiKeys = new PolicyStatement({
		actions: ['apigateway:GET'],
		resources: [`arn:aws:apigateway:${region}::/apikeys/*`], // FIXME only CODE ones
	});
	const allowInvokeLambda = new PolicyStatement({
		actions: ['execute-api:Invoke'],
		resources: [`arn:aws:execute-api:${region}:${account}:*/CODE/*`],
	});

	return [
		fulfilmentDatesBucketPolicy,
		allowListStackResources,
		unsafeAllowGetAllApiKeys,
		allowInvokeLambda,
	];
}

function getSupportAdminConsoleBucketPolicy() {
	const supportAdminConsoleBucketPolicy = new AllowS3GetPolicy(
		'support-admin-console',
		[
			'google-auth-service-account-certificate.json', // needed to run locally
			'DEV/*',
			'CODE/*',
		],
	);
	return supportAdminConsoleBucketPolicy;
}
