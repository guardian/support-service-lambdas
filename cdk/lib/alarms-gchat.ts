import type {
	GuLambdaErrorPercentageMonitoringProps,
	NoMonitoring,
} from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack, GuStringParameter } from '@guardian/cdk/lib/constructs/core';
import { GuSnsLambdaExperimental } from '@guardian/cdk/lib/experimental/patterns';
import type { App } from 'aws-cdk-lib';
import { CfnMapping, Duration } from 'aws-cdk-lib';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';

export interface AlarmsGchatProps extends GuStackProps {
	stack: string;
	stage: string;
}

export class AlarmsGchat extends GuStack {
	constructor(scope: App, id: string, props: AlarmsGchatProps) {
		super(scope, id, props);

		const app = 'alarms-gchat';
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		const parameters = {
			webhook: new GuStringParameter(this, 'webhook', {
				description: 'Google Chat webhook for lambda to fire to',
			}),
		};
		// const stageMapping = new CfnMapping(this, 'stageMapping', {
		// 	mapping: {
		// 		CODE: { alarmActionsEnabled: 'FALSE' },
		// 		PROD: { alarmActionsEnabled: 'TRUE' },
		// 	},
		// });

		const snsTopic = new Topic(this, `${app}-topic`, {
			topicName: `${app}-topic-${props.stage}`,
		});

		// const getMonitoringConfiguration = ():
		// 	| NoMonitoring
		// 	| GuLambdaErrorPercentageMonitoringProps => {
		// 	if (this.stage === 'PROD' || this.stage === 'CODE') {
		// 		return {
		// 			alarmName: `Failed to raise alarm via Google Chat in ${this.stage}`,
		// 			alarmDescription:
		// 				'Please check the CloudWatch Alarms dashboard to see which alarms are firing',
		// 			toleratedErrorPercentage: 0,
		// 			snsTopicName: 'mobile-server-side-email-alert',
		// 			// We can't use ternaries or other code-based ways of doing this as we synthesise this before applying, meaning this will always return false and therefore CODE
		// 			actionsEnabled: stageMapping.findInMap(
		// 				this.stage,
		// 				'alarmActionsEnabled',
		// 			) as unknown as boolean,
		// 		};
		// 	}
		// 	return {
		// 		noMonitoring: true,
		// 	};
		// };

		const lambda = new GuSnsLambdaExperimental(
			this,
			'google-chat-bot-sns-to-gchat',
			{
				description:
					'An API Gateway triggered lambda generated in the support-service-lambdas repo',
				functionName: nameWithStage,
				fileName: `${app}.zip`,
				handler: 'index.handler',
				runtime: Runtime.NODEJS_18_X,
				memorySize: 1024,
				environment: {
					WEBHOOK: parameters.webhook.valueAsString,
					...commonEnvironmentVariables,
				},
				timeout: Duration.seconds(15),
				existingSnsTopic: { externalTopicName: snsTopic.topicName },
				monitoringConfiguration: { noMonitoring: true },
				app: app,
			},
		);

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
