import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BucketEncryption, EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';

export interface GenerateProductCatalogProps extends GuStackProps {
	stack: string;
	stage: string;
}

export const productCatalogBucketName: string = 'gu-product-catalog';

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

		const zuoraCatalogFolder = `PROD/Zuora-${this.stage}/`;
		const zuoraCatalogBucket = Bucket.fromBucketName(
			this,
			'gu-zuora-catalog',
			'gu-zuora-catalog',
		);

		zuoraCatalogBucket.addEventNotification(
			EventType.OBJECT_CREATED,
			new LambdaDestination(lambda),
			{
				prefix: zuoraCatalogFolder,
			},
		);

		const productCatalogBucket = new Bucket(this, productCatalogBucketName, {
			bucketName: productCatalogBucketName,
			encryption: BucketEncryption.S3_MANAGED,
			enforceSSL: true,
			versioned: true,
			publicReadAccess: true,
		});

		const s3InlinePolicy: Policy = new Policy(this, 'S3 inline policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`,
						`arn:aws:s3::*:gu-zuora-catalog/${zuoraCatalogFolder}/`,
					],
				}),
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:PutObject'],
					resources: [productCatalogBucket.bucketArn],
				}),
			],
		});

		lambda.role?.attachInlinePolicy(s3InlinePolicy);

		// ---- DNS ---- //
		// const domainName = `product-catalog-${this.stage}.${supportApisDomain}`;

		// new GuCname(this, 'Cname', {
		// 	app,
		// 	domainName,
		// 	ttl: Duration.minutes(1),
		// 	resourceRecord: 'dualstack.guardian.map.fastly.net.',
		// });

		// const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${supportCertificateId}`;
		// const cfnDomainName = new CfnDomainName(this, 'DomainName', {
		// 	domainName: domainName,
		// 	regionalCertificateArn: certificateArn,
		// 	endpointConfiguration: {
		// 		types: ['REGIONAL'],
		// 	},
		// });
		//
		// new CfnBasePathMapping(this, 'BasePathMapping', {
		// 	domainName: cfnDomainName.ref,
		// 	restApiId: lambda.api.restApiId,
		// 	stage: lambda.api.deploymentStage.stageName,
		// });
		//
		// new CfnRecordSet(this, 'DNSRecord', {
		// 	name: domainName,
		// 	type: 'CNAME',
		// 	hostedZoneId: props.hostedZoneId,
		// 	ttl: '120',
		// 	resourceRecords: [cfnDomainName.attrRegionalDomainName],
		// });
	}
}
