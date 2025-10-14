import { GuApiGateway5xxPercentageAlarm } from '@guardian/cdk/lib/constructs/cloudwatch/api-gateway-alarms';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { AllowSupporterProductDataQueryPolicy } from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class PressReaderEntitlements extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'press-reader-entitlements' });

		const app = this.app;
		const nameWithStage = `${app}-${this.stage}`;

		const lambda = new SrApiLambda(this, {
			lambdaOverrides: {
				description:
					'An API Gateway triggered lambda generated in the support-service-lambdas repo',
			},
			errorImpact: 'some users would not be able to access ???',
			monitoring: { noMonitoring: true }, // we use the GuCDK 5xx alarm instead, see below
			srRestDomainProps: { publicDomain: true },
		});
		new GuApiGateway5xxPercentageAlarm(this, {
			app: this.app,
			apiGatewayInstance: lambda.api,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			tolerated5xxPercentage: 5,
		});

		lambda.addPolicies(new AllowSupporterProductDataQueryPolicy(this));

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
	}
}
