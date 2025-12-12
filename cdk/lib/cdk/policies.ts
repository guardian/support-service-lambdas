import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	GuAllowPolicy,
	GuGetS3ObjectsPolicy,
} from '@guardian/cdk/lib/constructs/iam';
import { Fn } from 'aws-cdk-lib';
import type { Policy } from 'aws-cdk-lib/aws-iam';

export class AllowGetSecretValuePolicy extends GuAllowPolicy {
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
	static createWithId = (
		scope: GuStack,
		id: string,
		queuePrefix: SrQueueName,
		...additionalQueuePrefixes: readonly SrQueueName[]
	): Policy =>
		new AllowSqsSendPolicy(scope, id, queuePrefix, ...additionalQueuePrefixes);

	static create = (
		scope: GuStack,
		queuePrefix: SrQueueName,
		...additionalQueuePrefixes: readonly SrQueueName[]
	): Policy =>
		new AllowSqsSendPolicy(
			scope,
			'SQS send policy',
			queuePrefix,
			...additionalQueuePrefixes,
		);

	private constructor(
		scope: GuStack,
		id: string,
		queuePrefix: SrQueueName,
		...additionalQueuePrefixes: readonly SrQueueName[]
	) {
		const queuePrefixes = [queuePrefix, ...additionalQueuePrefixes];
		const resources = queuePrefixes.map(
			(queuePrefix) =>
				`arn:aws:sqs:${scope.region}:${scope.account}:${queuePrefix}-${scope.stage}`,
		);
		super(scope, id, {
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
	constructor(scope: GuStack, id?: string) {
		super(
			scope,
			id ?? 'Zuora OAuth Secrets Manager policy',
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
