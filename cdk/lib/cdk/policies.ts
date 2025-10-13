import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	GuAllowPolicy,
	GuGetS3ObjectsPolicy,
} from '@guardian/cdk/lib/constructs/iam';
import { Fn } from 'aws-cdk-lib';

class AllowGetSecretValuePolicy extends GuAllowPolicy {
	constructor(scope: GuStack, id: string, key: string) {
		super(scope, id, {
			actions: ['secretsmanager:GetSecretValue'],
			resources: [
				`arn:aws:secretsmanager:${scope.region}:${scope.account}:secret:${scope.stage}/${key}`,
			],
		});
	}
}

export type SrQueueName =
	| `braze-emails`
	| 'supporter-product-data'
	| 'product-switch-salesforce-tracking';

export class AllowSqsSendPolicy extends GuAllowPolicy {
	constructor(
		scope: GuStack,
		queuePrefix: SrQueueName,
		...additionalQueuePrefixes: readonly SrQueueName[]
	) {
		const queuePrefixes = [queuePrefix, ...additionalQueuePrefixes];
		const resources = queuePrefixes.map(
			(queuePrefix) =>
				`arn:aws:sqs:${scope.region}:${scope.account}:${queuePrefix}-${scope.stage}`,
		);
		super(scope, 'SQS send policy', {
			actions: ['sqs:GetQueueUrl', 'sqs:SendMessage'],
			resources,
		});
	}
}

export class AllowS3CatalogReadPolicy extends GuGetS3ObjectsPolicy {
	constructor(scope: GuStack) {
		super(scope, 'S3 catalog read policy', {
			bucketName: 'gu-zuora-catalog',
			paths: [`PROD/Zuora-${scope.stage}/*`],
		});
	}
}

export class AllowZuoraOAuthSecretsPolicy extends AllowGetSecretValuePolicy {
	constructor(scope: GuStack) {
		super(
			scope,
			'Zuora OAuth Secrets Manager policy',
			'Zuora-OAuth/SupportServiceLambdas-*',
		);
	}
}

export class AllowSupporterProductDataQueryPolicy extends GuAllowPolicy {
	constructor(scope: GuStack) {
		super(scope, 'SupporterProductDataTable query access', {
			actions: ['dynamodb:Query'],
			resources: [
				Fn.importValue(
					`supporter-product-data-tables-${scope.stage}-SupporterProductDataTable`,
				),
			],
		});
	}
}
