import { GuApiLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuPutCloudwatchMetricsPolicy } from '@guardian/cdk/lib/constructs/iam';
import { type App, Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { SrRestDomain } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';
import { nodeVersion } from './node-version';

export class MetricPushApi extends SrStack {
	constructor(
		scope: App,
		stage: SrStageNames,
		cloudFormationStackName: string,
	) {
		super(scope, {
			stage,
			app: 'metric-push-api',
			cloudFormationStackName,
		});
		const app = this.app;
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
			loggingFormat: LoggingFormat.TEXT,
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

		const cloudwatchPutMetricPolicy = new GuPutCloudwatchMetricsPolicy(this);
		lambda.role?.attachInlinePolicy(cloudwatchPutMetricPolicy);

		const domain = new SrRestDomain(this, lambda.api, true);
		domain.dnsRecord.overrideLogicalId('MetricPushDNSRecord');
		domain.basePathMapping.overrideLogicalId('MetricPushBasePathMapping');
		domain.cfnDomainName.overrideLogicalId('MetricPushDomainName');

		// Alarms
		new SrLambdaAlarm(this, '5xxApiAlarm', {
			app,
			alarmName: `URGENT 9-5 - ${this.stage} ${nameWithStage} API Gateway is returning 5XX errors`,
			threshold: 2,
			evaluationPeriods: 1,
			lambdaFunctionNames: lambda.functionName,
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
			metric: new Metric({
				metricName: 'metric-push-api-client-side-error',
				namespace: 'support-service-lambdas',
				statistic: 'Sum',
				period: Duration.seconds(60),
				dimensionsMap: {
					Stage: this.stage,
					App: app,
				},
			}),
		});
	}
}
