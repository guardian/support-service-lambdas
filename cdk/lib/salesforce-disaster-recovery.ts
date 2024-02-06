import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';

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

		const createSalesforceQueryJobLambda = new GuLambdaFunction(
			this,
			'create-salesforce-query-job',
			{
				handler: 'dist/createSalesforceQueryJob.handler',
				functionName: `create-salesforce-query-job-${this.stage}`,
				...lambdaCommonConfig,
			},
		);

		const createSalesforceQueryJob = new LambdaInvoke(
			this,
			'CreateSalesforceQueryJob',
			{
				lambdaFunction: createSalesforceQueryJobLambda,
				outputPath: '$.Payload',
			},
		);

		const definition = createSalesforceQueryJob;

		new StateMachine(this, 'SalesforceDisasterRecoveryStateMachine', {
			definition,
		});
	}
}
