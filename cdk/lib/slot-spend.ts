import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Architecture, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { DefinitionBody, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

export class SlotSpend extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'slot-spend';

		const queryLambda = new GuLambdaFunction(this, 'query-lambda', {
			app: appName,
			functionName: `${appName}-query-${this.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			runtime: nodeVersion,
			handler: 'slotSpendQuery.handler',
			fileName: `${appName}.zip`,
			architecture: Architecture.ARM_64,
		});

		const updateLambda = new GuLambdaFunction(this, 'update-lambda', {
			app: appName,
			functionName: `${appName}-update-${this.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			runtime: nodeVersion,
			handler: 'slotSpendUpdate.handler',
			fileName: `${appName}.zip`,
			architecture: Architecture.ARM_64,
		});

		const queryLambdaTask = new LambdaInvoke(this, 'Query Spend', {
			lambdaFunction: queryLambda,
			outputPath: '$.Payload',
		});

		const updateLambdaTask = new LambdaInvoke(this, 'Update Spend', {
			lambdaFunction: updateLambda,
			inputPath: '$.Payload',
		});

		new StateMachine(this, `slot-spend-state-machine-${this.stage}`, {
			definitionBody: DefinitionBody.fromChainable(
				queryLambdaTask.next(updateLambdaTask),
			),
		});
	}
}
