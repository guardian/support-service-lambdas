import {
	GuAllowPolicy,
	GuGetS3ObjectsPolicy,
} from '@guardian/cdk/lib/constructs/iam';
import type { SrStack } from './sr-stack';

class AllowGetSecretValuePolicy extends GuAllowPolicy {
	constructor(scope: SrStack, key: string) {
		super(scope, 'Secrets Manager policy', {
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
	constructor(scope: SrStack, queuePrefixes: readonly SrQueueName[]) {
		const resources = queuePrefixes.map(
			(queuePrefix) =>
				`arn:aws:sqs:${scope.region}:${scope.account}:${queuePrefix}-${scope.stage}`,
		);
		super(scope, 'SQS policy', {
			actions: ['sqs:GetQueueUrl', 'sqs:SendMessage'],
			resources,
		});
	}
}

export class AllowS3CatalogReadPolicy extends GuGetS3ObjectsPolicy {
	constructor(scope: SrStack) {
		super(scope, 'S3 catalog read policy', {
			bucketName: 'gu-zuora-catalog',
			paths: [`PROD/Zuora-${scope.stage}/*`],
		});
	}
}

export class AllowZuoraOAuthSecretsPolicy extends AllowGetSecretValuePolicy {
	constructor(scope: SrStack) {
		super(scope, 'Zuora-OAuth/SupportServiceLambdas-*');
	}
}
