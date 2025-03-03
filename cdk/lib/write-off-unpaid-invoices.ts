import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
	// Choice,
	// Condition,
	CustomState,
	DefinitionBody,
	JsonPath,
	// Pass,
	StateMachine,
	// TaskInput,
	// Wait,
	// WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
// import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

export class WriteOffUnpaidInvoices extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'write-off-unpaid-invoices';

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${app}-${this.stage.toLowerCase()}`,
		});

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(300),
			environment: { APP: app, STACK: this.stack, STAGE: this.stage },
		};

		const writeOffInvoiceLambda = new GuLambdaFunction(
			this,
			'WriteOffInvoiceLambda',
			{
				...lambdaDefaultConfig,
				timeout: Duration.minutes(15),
				memorySize: 10240,
				handler: 'writeOffInvoice.handler',
				functionName: `write-off-invoice-${this.stage}`,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora/User/AndreaDiotallevi`,
						],
					}),
				],
			},
		);

		const processCsvInDistributedMap = new CustomState(
			this,
			'ProcessCsvInDistributedMap',
			{
				stateJson: {
					Type: 'Map',
					MaxConcurrency: 30,
					ToleratedFailurePercentage: 100,
					Comment: `ToleratedFailurePercentage is set to 100% because we want the distributed map state to complete processing all batches`,
					ItemReader: {
						Resource: 'arn:aws:states:::s3:getObject',
						ReaderConfig: {
							InputType: 'CSV',
							CSVHeaderLocation: 'FIRST_ROW',
						},
						Parameters: {
							Bucket: bucket.bucketName,
							Key: 'query-result.csv',
						},
					},
					ItemBatcher: {
						MaxItemsPerBatch: 1,
					},
					ItemProcessor: {
						ProcessorConfig: {
							Mode: 'DISTRIBUTED',
							ExecutionType: 'STANDARD',
						},
						StartAt: 'WriteOffInvoice',
						States: {
							WriteOffInvoice: {
								Type: 'Task',
								Resource: 'arn:aws:states:::lambda:invoke',
								OutputPath: '$.Payload',
								Parameters: {
									'Payload.$': '$',
									FunctionName: writeOffInvoiceLambda.functionArn,
								},
								Retry: [
									{
										ErrorEquals: [
											'Lambda.ServiceException',
											'Lambda.AWSLambdaException',
											'Lambda.SdkClientException',
											'Lambda.TooManyRequestsException',
										],
										IntervalSeconds: 2,
										MaxAttempts: 6,
										BackoffRate: 2,
									},
									{
										ErrorEquals: ['ZuoraError'],
										IntervalSeconds: 10,
										MaxAttempts: 5,
										BackoffRate: 5,
									},
								],
								End: true,
							},
						},
					},
					ResultWriter: {
						Resource: 'arn:aws:states:::s3:putObject',
						Parameters: {
							Bucket: bucket.bucketName,
							'Prefix.$': JsonPath.stringAt('$$.Execution.StartTime'),
						},
					},
				},
			},
		);

		const stateMachine = new StateMachine(
			this,
			'WriteOffUnpaidInvoicesStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(
					processCsvInDistributedMap,
				),
			},
		);

		stateMachine.role.attachInlinePolicy(
			new Policy(
				this,
				'WriteOffUnpaidInvoicesStateMachineRoleAdditionalPolicy',
				{
					statements: [
						new PolicyStatement({
							actions: ['s3:GetObject', 's3:PutObject'],
							resources: [bucket.arnForObjects('*')],
						}),
						new PolicyStatement({
							actions: ['states:StartExecution'],
							resources: [stateMachine.stateMachineArn],
						}),
						new PolicyStatement({
							actions: [
								'states:RedriveExecution',
								'states:DescribeExecution',
								'states:StopExecution',
							],
							resources: [
								`arn:aws:states:${this.region}:${this.account}:execution:${stateMachine.stateMachineName}/*`,
							],
						}),
						new PolicyStatement({
							actions: ['lambda:InvokeFunction'],
							resources: [writeOffInvoiceLambda.functionArn],
						}),
					],
				},
			),
		);
	}
}
