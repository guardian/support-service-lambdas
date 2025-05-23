import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import {
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
	CustomState,
	DefinitionBody,
	JsonPath,
	StateMachine,
	TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

export class WriteOffUnpaidInvoices extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'write-off-unpaid-invoices';

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${app}-${this.stage.toLowerCase()}`,
		});

		const unpaidInvoicesFileName = 'unpaid-invoices.csv';

		const bigQueryRole = new Role(this, 'BigQueryRole', {
			roleName: `wrtoff-unpaid-${this.stage}`, // Role name must be short to not break the authentication request to GCP
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
		});

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.minutes(3),
			environment: { Stage: this.stage },
		};

		const getUnpaidInvoicesLambdaTask = new LambdaInvoke(
			this,
			'getUnpaidInvoicesLambdaTask',
			{
				lambdaFunction: new GuLambdaFunction(this, 'GetUnpaidInvoicesLambda', {
					...lambdaDefaultConfig,
					environment: {
						...lambdaDefaultConfig.environment,
						GCP_CREDENTIALS_CONFIG_PARAMETER_NAME: `/${app}/${this.stage}/gcp-credentials-config`,
						GCP_PROJECT_ID: `datatech-platform-${this.stage.toLowerCase()}`,
						BUCKET_NAME: bucket.bucketName,
					},
					handler: 'getUnpaidInvoices.handler',
					functionName: `get-unpaid-invoices-${this.stage}`,
					initialPolicy: [
						new PolicyStatement({
							actions: ['sts:AssumeRole'],
							resources: [bigQueryRole.roleArn],
						}),
						new PolicyStatement({
							actions: ['ssm:GetParameter'],
							resources: [
								`arn:aws:ssm:${this.region}:${this.account}:parameter/${app}/${this.stage}/gcp-credentials-config`,
							],
						}),
						new PolicyStatement({
							actions: [
								's3:GetObject',
								's3:PutObject',
								's3:ListBucket',
								's3:ListMultipartUploadParts',
							],
							resources: [bucket.arnForObjects('*')],
						}),
					],
				}),
				payload: TaskInput.fromObject({
					filePath: JsonPath.format(
						`executions/{}/${unpaidInvoicesFileName}`,
						JsonPath.stringAt('$$.Execution.StartTime'),
					),
				}),
			},
		);

		const writeOffInvoicesLambda = new GuLambdaFunction(
			this,
			'WriteOffInvoicesLambda',
			{
				...lambdaDefaultConfig,
				memorySize: 512,
				timeout: Duration.minutes(15),
				handler: 'writeOffInvoices.handler',
				functionName: `write-off-invoices-${this.stage}`,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora/User/AndreaDiotallevi-*`,
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
					MaxConcurrency: 1,
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
							'Key.$': JsonPath.format(
								`executions/{}/${unpaidInvoicesFileName}`,
								JsonPath.stringAt('$$.Execution.StartTime'),
							),
						},
					},
					ItemBatcher: {
						MaxItemsPerBatch: 100,
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
									FunctionName: writeOffInvoicesLambda.functionArn,
								},
								End: true,
							},
						},
					},
					ItemSelector: {
						'item.$': '$$.Map.Item.Value',
						'comment.$': JsonPath.stringAt('$$.Execution.Input.Comment'),
						'reasonCode.$': JsonPath.stringAt('$$.Execution.Input.ReasonCode'),
						'remediationStrategy.$': JsonPath.stringAt(
							'$$.Execution.Input.RemediationStrategy',
						),
					},
					ResultWriter: {
						Resource: 'arn:aws:states:::s3:putObject',
						Parameters: {
							Bucket: bucket.bucketName,
							'Prefix.$': JsonPath.format(
								`executions/{}`,
								JsonPath.stringAt('$$.Execution.StartTime'),
							),
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
					getUnpaidInvoicesLambdaTask.next(processCsvInDistributedMap),
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
							actions: [
								's3:GetObject',
								's3:PutObject',
								's3:ListBucket',
								's3:ListMultipartUploadParts',
							],
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
							resources: [writeOffInvoicesLambda.functionArn],
						}),
					],
				},
			),
		);
	}
}
