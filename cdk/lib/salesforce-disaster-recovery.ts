import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration, SecretValue } from 'aws-cdk-lib';
import { Authorization, Connection } from 'aws-cdk-lib/aws-events';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
// import {} from 'aws-cdk-lib/aws-events-targets';
// import lambda from 'aws-cdk-lib/aws-lambda';
import {
	CustomState,
	DefinitionBody,
	StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
// import {} from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class SalesforceDisasterRecovery extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-disaster-recovery';
		const runtime = Runtime.NODEJS_20_X;
		const fileName = `${app}.zip`;
		const timeout = Duration.seconds(300);
		const memorySize = 1024;
		const environment = {
			APP: app,
			STACK: this.stack,
			STAGE: this.stage,
		};

		const lambdaCommonConfig = {
			app,
			runtime,
			fileName,
			timeout,
			memorySize,
			environment,
		};

		const createSalesforceQueryJobLambda = new GuLambdaFunction(
			this,
			'CreateSalesforceQueryJobLambda',
			{
				handler: 'createSalesforceQueryJob.handler',
				functionName: `create-salesforce-query-job-${this.stage}`,
				...lambdaCommonConfig,
			},
		);

		// const salesforceApiConnection = new Connection(
		// 	this,
		// 	'SalesforceApiConnection',
		// 	{
		// 		authorization: Authorization.apiKey(
		// 			'events!connection/salesforce-disaster-recovery-CODE-salesforce-api/a9fe1227-5dae-4f09-87f2-edb097875608',
		// 			SecretValue.secretsManager(
		// 				'arn:aws:secretsmanager:eu-west-1:865473395570:secret:events!connection/salesforce-disaster-recovery-CODE-salesforce-api/a9fe1227-5dae-4f09-87f2-edb097875608-3cQPK0',
		// 			),
		// 		),
		// 		description: 'Salesforce API authentication',
		// 		connectionName: `${app}-${this.stage}-salesforce-api-connection`,
		// 	},
		// );

		const createSalesforceQueryJob = new CustomState(
			this,
			'CreateSalesforceQueryJob',
			{
				stateJson: {
					Type: 'Task',
					Resource: 'arn:aws:states:::http:invoke',
					Parameters: {
						ApiEndpoint:
							'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com/services/data/v60.0/jobs/query',
						Method: 'POST',
						Authentication: {
							// ConnectionArn: salesforceApiConnection.connectionArn,
							ConnectionArn:
								'arn:aws:events:eu-west-1:865473395570:connection/salesforce-disaster-recovery-CODE-salesforce-api/5ffa1b46-6757-4c6d-aea6-9ebc9aef983c',
						},
						RequestBody: {
							operation: 'query',
							query:
								'SELECT Id, Zuora__Zuora_Id__c, Zuora__Account__c, Contact__c from Zuora__CustomerAccount__c',
						},
						// RequestBody: {
						// 	data: {
						// 		type: 'licenses',
						// 		attributes: {
						// 			metadata: {
						// 				'transactionId.$': '$.data.id',
						// 				'customerId.$': '$.data.customer_id',
						// 			},
						// 		},
						// 		relationships: {
						// 			policy: {
						// 				data: {
						// 					type: 'policies',
						// 					id: '8c2294b0-dbbe-4028-b561-6aa246d60951',
						// 				},
						// 			},
						// 		},
						// 	},
						// },
					},
					// ResultSelector: {
					// 	'body.$': 'States.StringToJson($.ResponseBody)',
					// },
					// OutputPath: '$.body',
				},
			},
		);

		const stateMachine = new StateMachine(
			this,
			'SalesforceDisasterRecoveryStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(createSalesforceQueryJob),
			},
		);

		stateMachine.role.attachInlinePolicy(
			new Policy(this, 'HttpInvoke', {
				statements: [
					new PolicyStatement({
						actions: ['states:InvokeHTTPEndpoint'],
						resources: [stateMachine.stateMachineArn],
						conditions: {
							StringEquals: {
								'states:HTTPMethod': 'POST',
							},
							StringLike: {
								'states:HTTPEndpoint':
									'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com/services/data/v60.0/jobs/query',
							},
						},
					}),
					new PolicyStatement({
						actions: ['events:RetrieveConnectionCredentials'],
						// resources: [salesforceApiConnection.connectionArn],
						resources: [
							'arn:aws:events:eu-west-1:865473395570:connection/salesforce-disaster-recovery-CODE-salesforce-api/5ffa1b46-6757-4c6d-aea6-9ebc9aef983c',
						],
					}),
					new PolicyStatement({
						actions: [
							'secretsmanager:GetSecretValue',
							'secretsmanager:DescribeSecret',
						],
						resources: [
							'arn:aws:secretsmanager:*:*:secret:events!connection/*',
						],
					}),
				],
			}),
		);
	}
}
