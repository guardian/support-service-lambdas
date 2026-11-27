import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { DefinitionBody, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

export class SlotSpend extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'slot-spend';

		new Table(this, 'SlotSpendTable', {
			tableName: `${appName}-${this.stage}`,
			billingMode: BillingMode.PAY_PER_REQUEST,
			partitionKey: { name: 'channel', type: AttributeType.STRING },
			sortKey: { name: 'testName', type: AttributeType.STRING },
			encryption: TableEncryption.AWS_MANAGED,
			removalPolicy:
				this.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
		});

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
		});

		new StateMachine(this, `slot-spend-state-machine-${this.stage}`, {
			definitionBody: DefinitionBody.fromChainable(
				queryLambdaTask.next(updateLambdaTask),
			),
		});
	}
}
