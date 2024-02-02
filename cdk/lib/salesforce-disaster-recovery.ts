// import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
// import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
// import { EventBus, Match, Rule } from 'aws-cdk-lib/aws-events';
// import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
// import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
// import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
// import { Topic } from 'aws-cdk-lib/aws-sns';
import {
	// Choice,
	// Condition,
	// JsonPath,
	// Map,
	// Parallel,
	// Pass,
	StateMachine,
	// Wait,
	// WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
// import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
// import { Queue } from 'aws-cdk-lib/aws-sqs';

export class SalesforceDisasterRecovery extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-disaster-recovery';
		const runtime = Runtime.NODEJS_18_X;
		const fileName = `${app}.zip`;
		const timeout = Duration.millis(45000);
		const environment = {
			Bucket: `${app}-dist`,
			Stage: this.stage,
		};

		const lambdaCommonConfig = { app, runtime, fileName, environment, timeout };

		// Lambda functions
		const createSalesforceQueryJobLambda = new GuLambdaFunction(
			this,
			'create-salesforce-query-job',
			{
				handler: 'dist/createSalesforceQueryJob.handler',
				functionName: `create-salesforce-query-job-${this.stage}`,
				...lambdaCommonConfig,
				// initialPolicy: [allowPutMetric],
			},
		);

		// Define the Step Functions state machine
		const createSalesforceQueryJob = new LambdaInvoke(
			this,
			'CreateSalesforceQueryJob',
			{
				lambdaFunction: createSalesforceQueryJobLambda,
				outputPath: '$.Payload', // Specify the output path if your Lambda returns JSON
			},
		);

		// Define the workflow structure
		const definition = createSalesforceQueryJob;

		// Create the Step Functions state machine
		new StateMachine(this, 'SalesforceDisasterRecoveryStateMachine', {
			definition,
			// timeout: Duration.minutes(5),
		});
	}
}
