import { GuApiLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import type { App } from 'aws-cdk-lib';
import { Duration, Fn } from 'aws-cdk-lib';
import {
	ApiKeySourceType,
	CfnBasePathMapping,
	CfnDomainName,
} from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { nodeVersion } from './node-version';

export interface PressReaderEntitlementsProps extends GuStackProps {
	stack: string;
	stage: string;
	internalDomainName: string;
	publicDomainName: string;
	hostedZoneId: string;
	certificateId: string;
	supporterProductDataTable: string;
}

export class PressReaderEntitlements extends GuStack {
	constructor(scope: App, id: string, props: PressReaderEntitlementsProps) {
		super(scope, id, props);

		const app = 'press-reader-entitlements';
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		const supporterProductDataTablePolicy = new PolicyStatement({
			actions: ['dynamodb:Query'],
			resources: [Fn.importValue(props.supporterProductDataTable)],
		});

		// ---- API-triggered lambda functions ---- //
		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description:
				'An API Gateway triggered lambda generated in the support-service-lambdas repo',
			functionName: nameWithStage,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			initialPolicy: [supporterProductDataTablePolicy],
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			// Create an alarm
			monitoringConfiguration: {
				http5xxAlarm: { tolerated5xxPercentage: 5 },
				snsTopicName: `alarms-handler-topic-${this.stage}`,
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
			description: 'REST endpoints for press-reader-entitlements',
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
			`press-reader-entitlements-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new SrLambdaAlarm(this, 'ApiGateway4XXAlarmCDK', {
			app,
			alarmName: alarmName('API gateway 4XX response'),
			alarmDescription: alarmDescription(
				'Press reader entitlements received an invalid request',
			),
			evaluationPeriods: 1,
			threshold: 10,
			lambdaFunctionNames: lambda.functionName,
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
			domainName: props.internalDomainName,
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
			name: props.internalDomainName,
			type: 'CNAME',
			hostedZoneId: props.hostedZoneId,
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});

		new GuCname(this, `NS1 DNS entry for ${props.publicDomainName}`, {
			app: app,
			domainName: props.publicDomainName,
			ttl: Duration.hours(1),
			resourceRecord: 'dualstack.guardian.map.fastly.net',
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

		lambda.role?.attachInlinePolicy(s3InlinePolicy);
	}
}
