import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';

export interface GenerateProductCatalogProps extends GuStackProps {
	stack: string;
	stage: string;
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
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: Runtime.NODEJS_18_X,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			app: app,
		});

		const bucket = new Bucket(this, 'gu-product-catalog');
		lambda.addEventSource(
			new S3EventSource(bucket, {
				events: [EventType.OBJECT_CREATED],
				filters: [{ prefix: `${this.stage}/` }],
			}),
		);

		const s3InlinePolicy: Policy = new Policy(this, 'S3 inline policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`,
						`arn:aws:s3::*:gu-zuora-catalog/PROD/Zuora-${this.stage}/`,
					],
				}),
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:PutObject'],
					resources: [
						`arn:aws:s3::*:gu-zuora-catalog/PROD/Zuora-${this.stage}/`,
					],
				}),
			],
		});

		lambda.role?.attachInlinePolicy(s3InlinePolicy);
	}
}
