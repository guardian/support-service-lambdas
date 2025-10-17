import type { App } from 'aws-cdk-lib';
import { CfnAlarm } from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { metricNamespace } from '../../modules/aws/src/cloudwatch';
import { SrLambda } from './cdk/SrLambda';
import { SrLambdaErrorAlarm } from './cdk/SrLambdaErrorAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';
import { SrFastlyDomain } from './cdk/SrFastlyDomain';

export const productCatalogBucketName = 'gu-product-catalog';
export const failedSchemaValidationMetricName = 'failed-schema-validation';

export class GenerateProductCatalog extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'generate-product-catalog', stage });

		const app = this.app;

		const lambda = new SrLambda(this, 'Lambda', {
			legacyId: `${app}-lambda`,
			lambdaOverrides: {
				description:
					'A lambda to generate the Guardian product catalog from the Zuora catalog',
				memorySize: 1232,
			},
		});

		const zuoraCatalogBucketName = 'gu-zuora-catalog';
		const zuoraCatalogFolder = `PROD/Zuora-${this.stage}`;
		const zuoraCatalogBucket = Bucket.fromBucketName(
			this,
			zuoraCatalogBucketName,
			zuoraCatalogBucketName,
		);

		zuoraCatalogBucket.addEventNotification(
			EventType.OBJECT_CREATED,
			new LambdaDestination(lambda),
			{
				prefix: zuoraCatalogFolder,
			},
		);

		const productCatalogBucket = Bucket.fromBucketName(
			this,
			productCatalogBucketName,
			productCatalogBucketName,
		);

		const s3InlinePolicy: Policy = new Policy(this, 'S3 inline policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`,
						`arn:aws:s3::*:gu-zuora-catalog/${zuoraCatalogFolder}/*`,
					],
				}),
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:PutObject'],
					resources: [`${productCatalogBucket.bucketArn}/${this.stage}/*`],
				}),
			],
		});

		const putMetricPolicy: Policy = new Policy(this, 'Put Metric Policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['cloudwatch:PutMetricData'],
					resources: ['*'],
					conditions: {
						StringEquals: {
							'cloudwatch:namespace': metricNamespace,
						},
					},
				}),
			],
		});

		lambda.addPolicies(putMetricPolicy, s3InlinePolicy);

		new SrFastlyDomain(this, 'NS1 DNS entry', {
			prefixOverride: 'product-catalog',
		});

		const logsUrl = `https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fgenerate-product-catalog-${this.stage}`;
		new CfnAlarm(this, 'failedSchemaValidationAlarm', {
			alarmActions: [
				`arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`,
			],
			alarmName: `The generate-product-catalog-${this.stage} lambda generated a catalog which cannot be parsed by the current schema`,
			alarmDescription:
				'A run of the generate-product-catalog lambda generated a version of the product catalog which failed to ' +
				'validate against the current schema.\nThis version was not written to S3 to stop it causing errors with ' +
				'production applications, but this means that the catalog is out of date in some way.\n' +
				`Check the logs at ${logsUrl} to find the cause`,
			comparisonOperator: 'GreaterThanOrEqualToThreshold',
			dimensions: [
				{
					name: 'Stage',
					value: this.stage,
				},
				{
					name: 'App',
					value: app,
				},
			],
			actionsEnabled: this.stage === 'PROD',
			evaluationPeriods: 1,
			metricName: failedSchemaValidationMetricName,
			namespace: metricNamespace,
			period: 60, // 1 minute
			statistic: 'Sum',
			threshold: 1,
			treatMissingData: 'notBreaching',
		});

		new SrLambdaErrorAlarm(this, `FailedProductCatalogLambdaAlarm`, {
			errorImpact:
				'This means the product catalog may not be up to date in S3. This lambda runs on a regular schedule so action will only be necessary if the alarm is triggered continuously',
			lambdaFunctionName: lambda.functionName,
		});
	}
}
