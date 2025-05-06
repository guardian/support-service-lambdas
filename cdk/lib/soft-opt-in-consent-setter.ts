import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import {
	aws_dynamodb,
	aws_events,
	aws_lambda,
	CfnCondition,
	Duration,
	Fn,
	Tags,
} from 'aws-cdk-lib';
import { CfnAlarm } from 'aws-cdk-lib/aws-cloudwatch';
import { EventBus, Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import {
	AccountPrincipal,
	Effect,
	ManagedPolicy,
	PolicyDocument,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { IConstruct } from 'constructs';

export interface SoftOptInConsentSetterProps extends GuStackProps {
	mobileAccountIdSSMParam: string;
	schedule: string;
	acquisitionsEventBusArn: string;
}

export class SoftOptInConsentSetter extends GuStack {
	constructor(scope: App, id: string, props: SoftOptInConsentSetterProps) {
		super(scope, id, props);

		// SSM Params
		const mobileAccountId = StringParameter.fromStringParameterName(
			this,
			'MobileAccountId',
			props.mobileAccountIdSSMParam,
		).stringValue;

		// Conditions
		const isProd = new CfnCondition(this, 'IsProd', {
			expression: Fn.conditionEquals(this.stage, 'PROD'),
		});

		// SQS Queues
		const softOptInsDeadLetterQueue = new Queue(
			this,
			'SoftOptInsDeadLetterQueue',
			{
				queueName: `soft-opt-in-consent-setter-dead-letter-queue-${this.stage}`,
				retentionPeriod: Duration.seconds(864000),
			},
		);
		const softOptInsQueue = new Queue(this, 'SoftOptInsQueue', {
			queueName: `soft-opt-in-consent-setter-queue-${this.stage}`,
			visibilityTimeout: Duration.seconds(3000),
			deadLetterQueue: {
				maxReceiveCount: 3,
				queue: softOptInsDeadLetterQueue,
			},
		});

		// IAM Roles
		new Role(this, 'SoftOptInsQueueCrossAccountRole', {
			roleName: `membership-${this.stage}-soft-opt-in-consent-setter-QueueCrossAccountRole`,
			assumedBy: new AccountPrincipal(mobileAccountId),
			inlinePolicies: {
				SQSAccess: new PolicyDocument({
					statements: [
						new PolicyStatement({
							actions: [
								'sqs:SendMessage',
								'sqs:ReceiveMessage',
								'sqs:DeleteMessage',
								'sqs:GetQueueAttributes',
							],
							resources: [softOptInsQueue.queueArn],
							effect: Effect.ALLOW,
						}),
					],
				}),
			},
		});

		const lambdaFunctionRole = new Role(this, 'LambdaFunctionRole', {
			roleName: `membership-${this.stage}-soft-opt-in-consent-setter-LambdaFunctionRole`,
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole',
				),
			],
		});
		lambdaFunctionRole.addToPolicy(
			new PolicyStatement({
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
			}),
		);
		lambdaFunctionRole.addToPolicy(
			new PolicyStatement({
				sid: 'readDeployedArtefact',
				actions: ['s3:GetObject'],
				resources: ['arn:aws:s3::*:membership-dist/*'],
			}),
		);

		const lambdaFunctionIAPRole = new Role(this, 'LambdaFunctionIAPRole', {
			roleName: `membership-${this.stage}-soft-opt-in-consent-setter-LambdaFunctionIAPRole`,
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole',
				),
			],
		});
		lambdaFunctionIAPRole.addToPolicy(
			new PolicyStatement({
				actions: ['dynamodb:PutItem'],
				resources: [
					`arn:aws:dynamodb:${this.region}:${this.account}:table/soft-opt-in-consent-setter-${this.stage}-logging`,
				],
			}),
		);
		lambdaFunctionIAPRole.addToPolicy(
			new PolicyStatement({
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
			}),
		);
		lambdaFunctionIAPRole.addToPolicy(
			new PolicyStatement({
				actions: ['s3:GetObject'],
				resources: ['arn:aws:s3::*:membership-dist/*'],
			}),
		);
		lambdaFunctionIAPRole.addToPolicy(
			new PolicyStatement({
				actions: [
					'sqs:DeleteMessage',
					'sqs:GetQueueAttributes',
					'sqs:ReceiveMessage',
				],
				resources: [softOptInsQueue.queueArn],
			}),
		);
		lambdaFunctionIAPRole.addToPolicy(
			new PolicyStatement({
				actions: [
					'secretsmanager:DescribeSecret',
					'secretsmanager:GetSecretValue',
				],
				resources: [
					'CODE/Salesforce/ConnectedApp/AwsConnectorSandbox-jaCgRl',
					'PROD/Salesforce/ConnectedApp/TouchpointUpdate-lolLqP',
					'CODE/Salesforce/User/SoftOptInConsentSetterAPIUser-KjHQBG',
					'PROD/Salesforce/User/SoftOptInConsentSetterAPIUser-EonJb0',
					'CODE/Identity/SoftOptInConsentAPI-n7Elrb',
					'PROD/Identity/SoftOptInConsentAPI-sJJo2s',
					'CODE/MobilePurchasesAPI/User/GetSubscriptions-iCUzGN',
					'PROD/MobilePurchasesAPI/User/GetSubscriptions-HZuC6H',
				].map(
					(resource) =>
						`arn:aws:secretsmanager:eu-west-1:${this.account}:secret:` +
						resource,
				),
			}),
		);

		// Lambda Functions
		const lambdaFunction = new GuScheduledLambda(this, 'LambdaFunction', {
			app: 'soft-opt-in-consent-setter',
			fileName: 'soft-opt-in-consent-setter.jar',
			monitoringConfiguration: {
				noMonitoring: true,
			},
			rules: [
				{
					schedule: Schedule.expression(props.schedule),
					description: 'Runs Soft Opt-In Consent Setter',
				},
			],
			functionName: `soft-opt-in-consent-setter-${this.stage}`,
			runtime: Runtime.JAVA_11, // keep on 11 for now due to http PATCH issue
			handler: 'com.gu.soft_opt_in_consent_setter.Handler::handleRequest',
			memorySize: 512,
			timeout: Duration.seconds(900),
			environment: {
				Stage: this.stage,
				sfApiVersion: 'v46.0',
			},
		});

		const lambdaFunctionIAP = new GuLambdaFunction(this, 'LambdaFunctionIAP', {
			app: 'soft-opt-in-consent-setter',
			fileName: 'soft-opt-in-consent-setter.jar',
			role: lambdaFunctionIAPRole,
			functionName: `soft-opt-in-consent-setter-IAP-${this.stage}`,
			runtime: Runtime.JAVA_11, // keep on 11 for now due to http PATCH issue
			handler: 'com.gu.soft_opt_in_consent_setter.HandlerIAP::handleRequest',
			memorySize: 512,
			timeout: Duration.seconds(300),
			environment: {
				Stage: this.stage,
				sfApiVersion: 'v56.0',
			},
		});

		// SQS Triggers
		const sqsTrigger = new aws_lambda.EventSourceMapping(this, 'SQSTrigger', {
			eventSourceArn: softOptInsQueue.queueArn,
			target: lambdaFunctionIAP,
			batchSize: 1,
			enabled: true,
		});

		// DynamoDB Tables
		const softOptInsLoggingTable = new aws_dynamodb.Table(
			this,
			'SoftOptInsLoggingTable',
			{
				tableName: `soft-opt-in-consent-setter-${this.stage}-logging`,
				billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
				partitionKey: {
					name: 'identityId',
					type: aws_dynamodb.AttributeType.STRING,
				},
				sortKey: { name: 'timestamp', type: aws_dynamodb.AttributeType.NUMBER },
				pointInTimeRecovery: true,
				encryption: aws_dynamodb.TableEncryption.AWS_MANAGED,
			},
		);
		softOptInsLoggingTable.addGlobalSecondaryIndex({
			indexName: 'subscriptionId-index',
			partitionKey: {
				name: 'subscriptionId',
				type: aws_dynamodb.AttributeType.STRING,
			},
			projectionType: aws_dynamodb.ProjectionType.ALL,
		});
		Tags.of(softOptInsLoggingTable).add('Stage', this.stage);
		Tags.of(softOptInsLoggingTable).add('devx-backup-enabled', 'true');

		// Cloudwatch Alarms
		const snsArn = `arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-PROD`;

		const failedRunAlarm = new CfnAlarm(this, 'failedRunAlarm', {
			alarmActions: [snsArn],
			alarmName: `soft-opt-in-consent-setter-${this.stage} failed to run`,
			alarmDescription:
				'Five or more runs found an error and were unable to complete. See GitHub README for details.',
			comparisonOperator: 'GreaterThanOrEqualToThreshold',
			dimensions: [
				{
					name: 'FunctionName',
					value: lambdaFunction.functionName,
				},
			],
			evaluationPeriods: 2,
			metricName: 'Errors',
			namespace: 'AWS/Lambda',
			period: 3600,
			statistic: 'Sum',
			threshold: 5,
			treatMissingData: 'notBreaching',
		});
		failedRunAlarm.cfnOptions.condition = isProd;

		const exceptionsAlarmIAP = new CfnAlarm(this, 'exceptionsAlarmIAP', {
			alarmActions: [snsArn],
			alarmName: `soft-opt-in-consent-setter-IAP-${this.stage} threw an exception`,
			alarmDescription:
				'Five or more errors for the IAP Lambda. See GitHub README for details.',
			comparisonOperator: 'GreaterThanOrEqualToThreshold',
			dimensions: [
				{
					name: 'FunctionName',
					value: lambdaFunctionIAP.functionName,
				},
			],
			evaluationPeriods: 2,
			metricName: 'Errors',
			namespace: 'AWS/Lambda',
			period: 3600,
			statistic: 'Sum',
			threshold: 5,
			treatMissingData: 'notBreaching',
		});
		exceptionsAlarmIAP.cfnOptions.condition = isProd;

		const deadLetterBuildUpAlarmIAP = new CfnAlarm(
			this,
			'deadLetterBuildUpAlarmIAP',
			{
				alarmActions: [snsArn],
				alarmName: `soft-opt-in-consent-setter-IAP-${this.stage} failed and sent a message to the dead letter queue.`,
				alarmDescription:
					'Alarm when the dead letter queue accumulates messages.',
				comparisonOperator: 'GreaterThanOrEqualToThreshold',
				dimensions: [
					{
						name: 'QueueName',
						value: softOptInsDeadLetterQueue.queueName,
					},
				],
				period: 300,
				evaluationPeriods: 1,
				metricName: 'ApproximateNumberOfMessagesVisible',
				namespace: 'AWS/SQS',
				statistic: 'Sum',
				threshold: 5,
				treatMissingData: 'notBreaching',
			},
		);
		deadLetterBuildUpAlarmIAP.cfnOptions.condition = isProd;

		const failedUpdateAlarm = new CfnAlarm(this, 'failedUpdateAlarm', {
			alarmActions: [snsArn],
			alarmName: `soft-opt-in-consent-setter-${this.stage} failed to update Salesforce records`,
			alarmDescription:
				'A run failed to update some Salesforce records in the last hour.',
			comparisonOperator: 'GreaterThanOrEqualToThreshold',
			dimensions: [
				{
					name: 'Stage',
					value: this.stage,
				},
			],
			evaluationPeriods: 1,
			metricName: 'failed_salesforce_update',
			namespace: 'soft-opt-in-consent-setter',
			period: 3600,
			statistic: 'Sum',
			threshold: 1,
			treatMissingData: 'notBreaching',
		});
		failedUpdateAlarm.cfnOptions.condition = isProd;

		const failedDynamoUpdateAlarm = new CfnAlarm(
			this,
			'failedDynamoUpdateAlarm',
			{
				alarmActions: [snsArn],
				alarmName: `soft-opt-in-consent-setter-${this.stage} failed to update the Dynamo logging table.`,
				alarmDescription:
					'A run failed to update the Dynamo logging table in the last hour.',
				comparisonOperator: 'GreaterThanOrEqualToThreshold',
				dimensions: [
					{
						name: 'Stage',
						value: this.stage,
					},
				],
				evaluationPeriods: 1,
				metricName: 'failed_dynamo_update',
				namespace: 'soft-opt-in-consent-setter',
				period: 3600,
				statistic: 'Sum',
				threshold: 1,
				treatMissingData: 'notBreaching',
			},
		);
		failedDynamoUpdateAlarm.cfnOptions.condition = isProd;

		// Logical ID overrides
		const resourcesKeepingExistingLogicalIds: Array<{
			construct: IConstruct;
			forcedLogicalId: string;
			reason: string;
		}> = [
			{
				construct: softOptInsQueue,
				forcedLogicalId: 'SoftOptInsQueue',
				reason: 'Retaining a stateful resource previously defined in YAML',
			},
			{
				construct: softOptInsDeadLetterQueue,
				forcedLogicalId: 'SoftOptInsDeadLetterQueue',
				reason: 'Retaining a stateful resource previously defined in YAML',
			},
			{
				construct: softOptInsLoggingTable,
				forcedLogicalId: 'SoftOptInsLoggingTable',
				reason: 'Retaining a stateful resource previously defined in YAML',
			},
			{
				construct: lambdaFunction,
				forcedLogicalId: 'LambdaFunction',
				reason: 'Moving existing lambda to CDK',
			},
			{
				construct: lambdaFunctionIAP,
				forcedLogicalId: 'LambdaFunctionIAP',
				reason: 'Moving existing lambda to CDK',
			},
			{
				construct: sqsTrigger,
				forcedLogicalId: 'SQSTrigger',
				reason: 'Moving existing lambda to CDK',
			},
		];
		resourcesKeepingExistingLogicalIds.forEach((resource) => {
			this.overrideLogicalId(resource.construct, {
				logicalId: resource.forcedLogicalId,
				reason: 'Retaining a stateful resource previously defined in YAML',
			});
		});

		// Acquisitions Event Bus (defined in support-frontend CDK)
		const acquisitionsEventBus = EventBus.fromEventBusArn(
			this,
			'AcquisitionsEventBus',
			props.acquisitionsEventBusArn,
		);

		// Rules
		new Rule(this, 'SoftOptInToSQSRule', {
			description:
				'Send all events received via support-workers onto soft opt-in SQS queue',
			eventBus: acquisitionsEventBus,
			eventPattern: {
				region: ['eu-west-1'],
				source: ['support-workers.1'],
			},
			targets: [
				new SqsQueue(softOptInsQueue, {
					message: aws_events.RuleTargetInput.fromObject({
						subscriptionId: aws_events.EventField.fromPath(
							'$.detail.zuoraSubscriptionNumber',
						),
						identityId: aws_events.EventField.fromPath('$.detail.identityId'),
						eventType: 'Acquisition',
						productName: aws_events.EventField.fromPath(
							'$.detail.product',
						),
						printOptions: aws_events.EventField.fromPath(
							'$.detail.printOptions',
						),
						previousProductName: null,
					}),
				}),
			],
		});
	}
}
