import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';

export class SalesforceDisasterRecoveryHealthCheck extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-disaster-recovery-health-check';

		const stateMachine = StateMachine.fromStateMachineName(
			this,
			'sdf',
			`salesforce-disaster-recovery-${this.stage}`,
		);

		new GuScheduledLambda(this, 'salesforce-disaster-recovery-health-check', {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.minutes(5),
			environment: {
				APP: app,
				STACK: this.stack,
				STAGE: this.stage,
				STATE_MACHINE_ARN: stateMachine.stateMachineArn,
			},
			handler: 'salesforceDisasterRecoveryHealthCheck.handler',
			functionName: `${app}-${this.stage}`,
			rules: [{ schedule: Schedule.cron({ minute: '0', hour: '9' }) }],
			monitoringConfiguration: { noMonitoring: true },
			initialPolicy: [
				new PolicyStatement({
					actions: ['states:StartExecution', 'states:DescribeExecution'],
					resources: [stateMachine.stateMachineArn],
				}),
			],
		});
	}
}

// lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
// 	actions: ['states:StartExecution', 'states:DescribeExecution'],
// 	resources: ['arn:aws:states:REGION:ACCOUNT_ID:stateMachine:YOUR_STATE_MACHINE_NAME'] // replace placeholders
//   }));
//   topic.grantPublish(lambdaFunction);
