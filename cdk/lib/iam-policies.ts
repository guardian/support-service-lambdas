import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuDeveloperPolicyExperimental } from '@guardian/cdk/lib/experimental/constructs/iam/policies';
import { type App } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class IamPolicies extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'iam-policies', stage });

		new GuDeveloperPolicyExperimental(this, 'LocalDevelopmentPolicy', {
			friendlyName:
				'Local Development' +
				(stage === 'PROD'
					? ''
					: ` (${stage} policy - use PROD version for general use)`),
			grantId: `membership-local-dev` + (stage === 'PROD' ? '' : `-${stage}`),
			withoutPolicyChecks: true,
			statements: [
				new AllowCodeS3ConfigReadPolicy(),
				new AllowCodeParameterStoreReadPolicy(this),
				new AllowCodeSecretsManagerReadPolicy(this),
			],
		});
	}
}

class AllowCodeS3ConfigReadPolicy extends PolicyStatement {
	constructor() {
		const bucketName = 'gu-reader-revenue-private';
		const paths = ['*/DEV/*', '*/CODE/*'];
		const s3Resources: string[] = paths.map(
			(path) => `arn:aws:s3:::${bucketName}/${path}`,
		);
		super({
			actions: ['s3:GetObject'],
			resources: s3Resources,
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
