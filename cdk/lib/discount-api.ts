import { GuApiLambda } from '@guardian/cdk';
import type {
	AppIdentity,
	GuStackProps,
} from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuGetDistributablePolicy } from '@guardian/cdk/lib/constructs/iam';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ApiKeySourceType,
	CfnBasePathMapping,
	CfnDomainName,
} from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import {
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { nodeVersion } from './node-version';

export interface DiscountApiProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class DiscountApi extends GuStack implements AppIdentity {
	readonly app: string;
	constructor(scope: App, id: string, props: DiscountApiProps) {
		super(scope, id, props);

		const app = 'discount-api';
		this.app = app;
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		// ---- API-triggered lambda functions ---- //
		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description:
				'A lambda that enables the addition of discounts to existing subscriptions',
			functionName: nameWithStage,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			monitoringConfiguration: {
				noMonitoring: true, // There is a threshold alarm defined below
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
			description: 'REST endpoints for discount api',
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

		[
			new GuGetDistributablePolicy(this, this),
			new AllowS3CatalogReadPolicy(this),
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(this, `braze-emails`),
		].forEach((p) => lambda.role!.attachInlinePolicy(p));

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`DISCOUNT-API-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new SrLambdaAlarm(this, 'ApiGateway5XXAlarmCDK', {
			app,
			alarmName: alarmName('Discount-api 5XX response'),
			alarmDescription: alarmDescription(
				'Discount api returned a 5XX response check the logs for more information: https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fdiscount-api-PROD',
			),
			evaluationPeriods: 1,
			threshold: 1,
			lambdaFunctionNames: lambda.functionName,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new Metric({
				metricName: '5XXError',
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
	}
}
