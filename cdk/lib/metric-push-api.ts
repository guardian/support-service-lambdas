import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { type App, Duration } from 'aws-cdk-lib';
import {
	CfnBasePathMapping,
	CfnDeployment,
	CfnDomainName,
	CfnMethod,
	CfnResource,
	CfnRestApi,
	CfnStage,
} from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	MathExpression,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';

export class MetricPushApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);
		const app = 'metric-push-api';
		const nameWithStage = `${app}-${this.stage}`;

		// const api = cloudformation.getResource('MetricPushAPI') as CfnRestApi;
		const api = new CfnRestApi(this, 'MetricPushAPI', {
			description:
				'HTTP API to push a metric to cloudwatch so we can alarm on errors',
			name: `${app}-api-${this.stage}`, // The existing resource has -api twice!
		});

		const resource = new CfnResource(this, 'MetricPushProxyResource', {
			restApiId: api.ref,
			parentId: api.attrRootResourceId,
			pathPart: 'metric-push-api',
		});

		new CfnMethod(this, 'MetricPushMethod', {
			authorizationType: 'NONE',
			apiKeyRequired: false,
			restApiId: api.ref,
			resourceId: resource.ref,
			httpMethod: 'GET',
			integration: {
				type: 'MOCK',
				requestTemplates: {
					'application/json': '{"statusCode": 200}',
				},
				integrationResponses: [
					{
						statusCode: '204',
						responseParameters: {
							'method.response.header.Cache-control': "'no-cache'",
						},
					},
				],
			},
			methodResponses: [
				{
					statusCode: '204',
					responseParameters: {
						'method.response.header.Cache-control': true,
					},
				},
			],
		});

		const deployment = new CfnDeployment(this, 'MetricPushAPIDeployment', {
			description: 'Deploys metric-push-api into an environment/stage',
			restApiId: api.ref,
		});

		new CfnStage(this, 'MetricPushAPIStage', {
			description: 'Stage for metric-push-api',
			restApiId: api.ref,
			deploymentId: deployment.ref,
			stageName: this.stage,
			methodSettings: [
				{
					resourcePath: '/*',
					httpMethod: '*',
					loggingLevel: 'INFO',
					dataTraceEnabled: true,
				},
			],
		});

		const domainName = new CfnDomainName(this, 'MetricPushDomainName', {
			regionalCertificateArn: `arn:aws:acm:${this.region}:${this.account}:certificate/b384a6a0-2f54-4874-b99b-96eeff96c009`,
			domainName: `metric-push-api-${this.stage.toLowerCase()}.support.guardianapis.com`,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(this, 'MetricPushBasePathMapping', {
			restApiId: api.ref,
			domainName: domainName.ref,
			stage: this.stage,
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
					ApiName: `${app}-api-${this.stage}`, // The existing resource has -api twice!
				},
			}),
		});
		new GuAlarm(this, 'HighClientSideErrorRateAlarm', {
			app,
			alarmName: `URGENT 9-5 - ${this.stage} fatal client-side errors are being reported to sentry for support-frontend`,
			alarmDescription: `Impact - some or all browsers are failing to render support client side pages. Log in to Sentry to see these errors: https://the-guardian.sentry.io/discover/results/?project=1213654&query="Fatal error rendering page"&queryDataset=error-events&sort=-count&statsPeriod=24h Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit ${nameWithStage}`,
			threshold: 2,
			evaluationPeriods: 5,
			datapointsToAlarm: 3,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			actionsEnabled: this.stage === 'PROD',
			treatMissingData: TreatMissingData.NOT_BREACHING,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new MathExpression({
				label: 'mtotal2xx',
				expression: 'mtotalcount - (m5xxcount + m4xxcount)',
				period: Duration.seconds(60),
				usingMetrics: {
					mtotalcount: new Metric({
						metricName: `Count`,
						namespace: 'AWS/ApiGateway',
						statistic: 'Sum',
						dimensionsMap: {
							ApiName: `${app}-api-${this.stage}`, // The existing resource has -api twice!
						},
					}),
					m5xxcount: new Metric({
						metricName: `5XXError`,
						namespace: 'AWS/ApiGateway',
						statistic: 'Sum',
						dimensionsMap: {
							ApiName: `${app}-api-${this.stage}`, // The existing resource has -api twice!
						},
					}),
					m4xxcount: new Metric({
						metricName: `4XXError`,
						namespace: 'AWS/ApiGateway',
						statistic: 'Sum',
						dimensionsMap: {
							ApiName: `${app}-api-${this.stage}`, // The existing resource has -api twice!
						},
					}),
				},
			}),
		});
	}
}
