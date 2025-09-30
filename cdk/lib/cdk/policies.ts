import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { SrStack } from './sr-stack';

export function s3CatalogReadPolicy(scope: SrStack) {
	return new Policy(scope, 'S3 catalog read policy', {
		statements: [
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['s3:GetObject'],
				resources: [
					...[`arn:aws:s3::*:gu-zuora-catalog/PROD/Zuora-${scope.stage}/*`],
				],
			}),
		],
	});
}

export function zuoraOAuthSecretsPolicy(scope: SrStack) {
	return new Policy(scope, 'Secrets Manager policy', {
		statements: [
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['secretsmanager:GetSecretValue'],
				resources: [
					`arn:aws:secretsmanager:${scope.region}:${scope.account}:secret:${scope.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
				],
			}),
		],
	});
}

export function getSqsPolicy(scope: SrStack, queuePrefixes: string[]) {
	const resources = queuePrefixes.map(
		(queuePrefix) =>
			`arn:aws:sqs:${scope.region}:${scope.account}:${queuePrefix}-${scope.stage}`,
	);
	return new Policy(scope, 'SQS policy', {
		statements: [
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['sqs:GetQueueUrl', 'sqs:SendMessage'],
				resources,
			}),
		],
	});
}
