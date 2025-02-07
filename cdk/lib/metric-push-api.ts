import { GuApiLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { type App, Duration } from 'aws-cdk-lib';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { nodeVersion } from './node-version';

export class MetricPushApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);
		const app = 'metric-push-api';
		const nameWithStage = `${app}-${this.stage}`;

		// Lambda & API Gateway
		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description:
				'API triggered lambda to push a metric to cloudwatch so we can alarm on errors',
			functionName: nameWithStage,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 512,
			timeout: Duration.seconds(60),
			environment: commonEnvironmentVariables,
			// Create an alarm
			monitoringConfiguration: {
				noMonitoring: true,
			},
			app: app,
			api: {
				id: nameWithStage,
				restApiName: nameWithStage,
				description: `API Gateway endpoint for the ${nameWithStage} lambda`,
				proxy: true,
				deployOptions: {
					stageName: this.stage,
				},
			},
		});

		// DNS
		const domainName = new CfnDomainName(this, 'MetricPushDomainName', {
			regionalCertificateArn: `arn:aws:acm:${this.region}:${this.account}:certificate/b384a6a0-2f54-4874-b99b-96eeff96c009`,
			domainName: `metric-push-api-${this.stage.toLowerCase()}.support.guardianapis.com`,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(this, 'MetricPushBasePathMapping', {
			restApiId: lambda.api.restApiId,
			domainName: domainName.ref,
			stage: lambda.api.deploymentStage.stageName,
		});

		const dnsRecord = new CfnRecordSet(this, 'MetricPushDNSRecord', {
			name: `metric-push-api-${this.stage.toLowerCase()}.support.guardianapis.com`,
			type: 'CNAME',
			comment: `CNAME for metric-push-api API ${this.stage}`,
			hostedZoneName: 'support.guardianapis.com.',
			ttl: '120',
			resourceRecords: [domainName.attrRegionalDomainName],
		});
		dnsRecord.overrideLogicalId('MetricPushDNSRecord');

		// Alarms
		new GuAlarm(this, '5xxApiAlarm', {
			app,
			alarmName: `URGENT 9-5 - ${this.stage} ${nameWithStage} API Gateway is returning 5XX errors`,
			threshold: 2,
			evaluationPeriods: 1,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			actionsEnabled: this.stage === 'PROD',
			treatMissingData: TreatMissingData.NOT_BREACHING,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			metric: new Metric({
				metricName: '5XXError',
				namespace: 'AWS/ApiGateway',
				statistic: 'Sum',
				period: Duration.seconds(60),
				dimensionsMap: {
					ApiName: nameWithStage,
				},
			}),
		});
		// new GuAlarm(this, 'HighClientSideErrorRateAlarm', {
		// 	app,
		// 	alarmName: `URGENT 9-5 - ${this.stage} fatal client-side errors are being reported to sentry for support-frontend`,
		// 	alarmDescription: `Impact - some or all browsers are failing to render support client side pages. Log in to Sentry to see these errors: https://the-guardian.sentry.io/discover/results/?project=1213654&query="Fatal error rendering page"&queryDataset=error-events&sort=-count&statsPeriod=24h Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit ${nameWithStage}`,
		// 	threshold: 2,
		// 	evaluationPeriods: 5,
		// 	datapointsToAlarm: 3,
		// 	snsTopicName: `alarms-handler-topic-${this.stage}`,
		// 	actionsEnabled: this.stage === 'PROD',
		// 	treatMissingData: TreatMissingData.NOT_BREACHING,
		// 	comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
		// 	metric: new MathExpression({
		// 		label: 'mtotal2xx',
		// 		expression: 'mtotalcount - (m5xxcount + m4xxcount)',
		// 		period: Duration.seconds(60),
		// 		usingMetrics: {
		// 			mtotalcount: new Metric({
		// 				metricName: `Count`,
		// 				namespace: 'AWS/ApiGateway',
		// 				statistic: 'Sum',
		// 				dimensionsMap: {
		// 					ApiName: `${app}-api-${this.stage}`, // The existing resource has -api twice!
		// 				},
		// 			}),
		// 			m5xxcount: new Metric({
		// 				metricName: `5XXError`,
		// 				namespace: 'AWS/ApiGateway',
		// 				statistic: 'Sum',
		// 				dimensionsMap: {
		// 					ApiName: `${app}-api-${this.stage}`, // The existing resource has -api twice!
		// 				},
		// 			}),
		// 			m4xxcount: new Metric({
		// 				metricName: `4XXError`,
		// 				namespace: 'AWS/ApiGateway',
		// 				statistic: 'Sum',
		// 				dimensionsMap: {
		// 					ApiName: `${app}-api-${this.stage}`, // The existing resource has -api twice!
		// 				},
		// 			}),
		// 		},
		// 	}),
		// });
	}
}
