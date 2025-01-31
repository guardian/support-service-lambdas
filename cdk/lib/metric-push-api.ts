import { join } from 'path';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { type App, Duration } from 'aws-cdk-lib';
import type { RestApi } from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';

export class MetricPushApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);
		const app = 'metric-push-api';
		const nameWithStage = `${app}-${this.stage}`;

		const yamlTemplateFilePath = join(
			__dirname,
			'../../handlers/metric-push-api/cfn.yaml',
		);
		new CfnInclude(this, 'YamlTemplate', {
			templateFile: yamlTemplateFilePath,
		});

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
	}
}
