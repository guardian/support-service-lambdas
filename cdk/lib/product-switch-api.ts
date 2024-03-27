import { GuApiLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ApiKeySourceType,
	CfnBasePathMapping,
	CfnDomainName,
} from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';

export interface ProductSwitchApiProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class ProductSwitchApi extends GuStack {
	constructor(scope: App, id: string, props: ProductSwitchApiProps) {
		super(scope, id, props);

		const app = 'product-switch-api';
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		// ---- API-triggered lambda functions ---- //
		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description:
				'An API Gateway triggered lambda generated in the support-service-lambdas repo',
			functionName: nameWithStage,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: Runtime.NODEJS_18_X,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			// Create an alarm
			monitoringConfiguration: {
				http5xxAlarm: { tolerated5xxPercentage: 5 },
				snsTopicName: 'retention-dev',
			},
			app: app,
			api: {
				id: nameWithStage,
				restApiName: nameWithStage,
				description: 'API Gateway created by CDK',
				proxy: true,
				deployOptions: {
					stageName: this.stage,
				},

				apiKeySourceType: ApiKeySourceType.HEADER,
				defaultMethodOptions: {
					apiKeyRequired: true,
				},
			},
		});

		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: nameWithStage,
			description: 'REST endpoints for product-switch-api>',
			apiStages: [
				{
					stage: lambda.api.deploymentStage,
					api: lambda.api,
				},
			],
		});

		// create api key
		const apiKey = lambda.api.addApiKey(`${app}-key-${this.stage}`, {
			apiKeyName: `${app}-key-${this.stage}`,
		});

		// associate api key to plan
		usagePlan.addApiKey(apiKey);

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`PRODUCT-SWITCH-API-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new GuAlarm(this, 'ApiGateway4XXAlarmCDK', {
			app,
			alarmName: alarmName('API gateway 4XX response'),
			alarmDescription: alarmDescription(
				'Product switch api received an invalid request',
			),
			evaluationPeriods: 1,
			threshold: 1,
			snsTopicName: 'retention-dev',
			actionsEnabled: this.stage === 'PROD',
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new Metric({
				metricName: '4XXError',
				namespace: 'AWS/ApiGateway',
				statistic: 'Sum',
				period: Duration.seconds(300),
				dimensionsMap: {
					ApiName: nameWithStage,
				},
			}),
		});

		// ---- DNS ---- //
		const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${props.certificateId}`;
		const cfnDomainName = new CfnDomainName(this, 'DomainName', {
			domainName: props.domainName,
			regionalCertificateArn: certificateArn,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(this, 'BasePathMapping', {
			domainName: cfnDomainName.ref,
			restApiId: lambda.api.restApiId,
			stage: lambda.api.deploymentStage.stageName,
		});

		new CfnRecordSet(this, 'DNSRecord', {
			name: props.domainName,
			type: 'CNAME',
			hostedZoneId: props.hostedZoneId,
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});

		const s3InlinePolicy: Policy = new Policy(this, 'S3 inline policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`,
					],
				}),
			],
		});

		const secretsManagerPolicy: Policy = new Policy(
			this,
			'Secrets Manager policy',
			{
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
						],
					}),
				],
			},
		);

		lambda.role?.attachInlinePolicy(s3InlinePolicy);
		lambda.role?.attachInlinePolicy(secretsManagerPolicy);
	}
}
