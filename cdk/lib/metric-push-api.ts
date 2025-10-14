import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuPutCloudwatchMetricsPolicy } from '@guardian/cdk/lib/constructs/iam';
import { type App, Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SrApiLambda } from './cdk/sr-api-lambda';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class MetricPushApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'metric-push-api' });
		const app = this.app;

		const lambda = new SrApiLambda(this, {
			lambdaOverrides: {
				description:
					'API triggered lambda to push a metric to cloudwatch so we can alarm on errors',
				timeout: Duration.seconds(60),
			},
			apiDescriptionOverride: `API Gateway endpoint for the ${app}-${this.stage} lambda`,
			isPublic: true,
			errorImpact: 'client side errors are not being recorded',
			monitoring: {
				threshold: 2,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			},
			srRestDomainProps: {
				suffixProdDomain: true,
			},
		});

		lambda.addPolicies(new GuPutCloudwatchMetricsPolicy(this));

		lambda.domain.dnsRecord.overrideLogicalId('MetricPushDNSRecord');
		lambda.domain.basePathMapping.overrideLogicalId(
			`MetricPushBasePathMapping`,
		);
		lambda.domain.cfnDomainName.overrideLogicalId(`MetricPushDomainName`);

		new GuAlarm(this, 'HighClientSideErrorRateAlarm', {
			app,
			alarmName: `URGENT 9-5 - ${this.stage} fatal client-side errors are being reported to sentry for support-frontend`,
			alarmDescription: `Impact - some or all browsers are failing to render support client side pages. Log in to Sentry to see these errors: https://the-guardian.sentry.io/discover/results/?project=1213654&query="Fatal error rendering page"&queryDataset=error-events&sort=-count&statsPeriod=24h Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit ${app}-${this.stage}`,
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
