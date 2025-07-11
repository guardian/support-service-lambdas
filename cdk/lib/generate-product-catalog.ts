import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { nodeVersion } from './node-version';

export interface GenerateProductCatalogProps extends GuStackProps {
	stack: string;
	stage: string;
	domainName: string;
}

export class GenerateProductCatalog extends GuStack {
	constructor(scope: App, id: string, props: GenerateProductCatalogProps) {
		super(scope, id, props);

		const app = 'generate-product-catalog';
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		const lambda = new GuLambdaFunction(this, `${app}-lambda`, {
			description:
				'A lambda to generate the Guardian product catalog from the Zuora catalog',
			functionName: nameWithStage,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 1232,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			app: app,
		});

		const zuoraCatalogBucketName = 'gu-zuora-catalog';
		const productCatalogBucketName = 'gu-product-catalog';
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

		lambda.role?.attachInlinePolicy(s3InlinePolicy);

		new GuCname(this, 'NS1 DNS entry', {
			app: app,
			domainName: props.domainName,
			ttl: Duration.hours(1),
			resourceRecord: 'guardian.map.fastly.net',
		});

		if (this.stage === 'PROD') {
			new SrLambdaAlarm(this, `FailedProductCatalogLambdaAlarm`, {
				app,
				alarmName: `The ${app} Lambda has failed`,
				alarmDescription:
					'This means the product catalog may not be up to date in S3. This lambda runs on a regular schedule so action will only be necessary if the alarm is triggered continuously',
				evaluationPeriods: 1,
				threshold: 1,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.seconds(300),
					dimensionsMap: {
						FunctionName: lambda.functionName,
					},
				}),
				lambdaFunctionNames: lambda.functionName,
			});
		}
	}
}
