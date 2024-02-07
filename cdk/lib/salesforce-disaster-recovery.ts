import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
// import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration, SecretValue } from 'aws-cdk-lib';
import { Authorization, Connection } from 'aws-cdk-lib/aws-events';
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
		// const runtime = lambda.Runtime.NODEJS_20_X;
		// const fileName = `${app}.zip`;
		// const timeout = Duration.seconds(300);
		// const memorySize = 1024;
		// const environment = {
		// 	APP: app,
		// 	STACK: this.stack,
		// 	STAGE: this.stage,
		// };

		// const lambdaCommonConfig = {
		// 	app,
		// 	runtime,
		// 	fileName,
		// 	timeout,
		// 	memorySize,
		// 	environment,
		// };

		// const createSalesforceQueryJobLambda = new GuLambdaFunction(
		// 	this,
		// 	'CreateSalesforceQueryJobLambda',
		// 	{
		// 		handler: 'createSalesforceQueryJob.handler',
		// 		functionName: `create-salesforce-query-job-${this.stage}`,
		// 		...lambdaCommonConfig,
		// 	},
		// );

		const salesforceApiConnection = new Connection(
			this,
			'SalesforceApiConnection',
			{
				authorization: Authorization.apiKey(
					'Authorization',
					SecretValue.secretsManager(
						'events!connection/salesforce-disaster-recovery-CODE-salesforce-api/a9fe1227-5dae-4f09-87f2-edb097875608',
					),
				),
				description: 'Salesforce API authentication',
				connectionName: `${app}-${this.stage}-salesforce-api-connection`,
			},
		);

		// const salesforceApiDestination = new events.ApiDestination(
		// 	this,
		// 	'SalesforceApiDestination',
		// 	{
		// 		connection: salesforceApiConnection,
		// 		endpoint:
		// 			'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com/services/data/v60.0/jobs/query',
		// 		apiDestinationName: `${app}-${this.stage}-salesforce-api-destination`,
		// 	},
		// );

		// const eventBus = new events.EventBus(this, 'EventBridgeBus', {
		// 	eventBusName: `${app}-${this.stage}-event-bus`,
		// });

		// new events.Rule(this, 'ApiDestinationRule', {
		// 	eventBus: eventBus,
		// 	ruleName: `${app}-${this.stage}-salesforce-api-destination-rule`,
		// 	targets: [
		// 		new targets.ApiDestination(salesforceApiDestination, {
		// 			event: events.RuleTargetInput.fromObject({
		// 				items: [],
		// 			}),
		// 		}),
		// 	],
		// 	eventPattern: {
		// 		region: [this.region],
		// 	},
		// });

		const createSalesforceQueryJob = new CustomState(this, 'test1', {
			stateJson: {
				Type: 'Task',
				Resource: 'arn:aws:states:::http:invoke',
				Parameters: {
					ApiEndpoint:
						'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com/services/data/v60.0/jobs/query',
					Method: 'POST',
					Authentication: {
						ConnectionArn: salesforceApiConnection.connectionArn,
					},
					RequestBody: {
						data: {
							type: 'licenses',
							attributes: {
								metadata: {
									'transactionId.$': '$.data.id',
									'customerId.$': '$.data.customer_id',
								},
							},
							// relationships: {
							// 	policy: {
							// 		data: {
							// 			type: 'policies',
							// 			id: '8c2294b0-dbbe-4028-b561-6aa246d60951',
							// 		},
							// 	},
							// },
						},
					},
				},
				ResultSelector: {
					'body.$': 'States.StringToJson($.ResponseBody)',
				},
				OutputPath: '$.body',
			},
		});

		new StateMachine(this, 'SalesforceDisasterRecoveryStateMachine', {
			stateMachineName: `${app}-${this.stage}`,
			definitionBody: DefinitionBody.fromChainable(createSalesforceQueryJob),
		});
	}
}
