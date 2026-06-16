import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ApiKeySourceType,
	AwsIntegration,
	EndpointType,
	MethodLoggingLevel,
	PassthroughBehavior,
	RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Schedule } from 'aws-cdk-lib/aws-events';
import {
	Effect,
	ManagedPolicy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import { SrScheduledLambda } from './cdk/SrScheduledLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class SfEmailsToS3Exporter extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stack: 'membership',
			stage,
			app: 'sf-emails-to-s3-exporter',
		});

		const lowerCaseStage = stage.toLowerCase();
		const bucketArn = `arn:aws:s3:::emails-from-sf-${lowerCaseStage}`;

		const lambda = new SrScheduledLambda(this, 'Lambda', {
			rules: [
				{
					schedule: Schedule.cron({ minute: '00,30', hour: '03' }),
					description: 'Runs SF Emails to S3 Exporter',
				},
			],
			// The 7 custom-metric alarms below replace the standard error alarm.
			monitoring: { noMonitoring: true },
			lambdaOverrides: {
				runtime: Runtime.JAVA_21,
				architecture: Architecture.X86_64,
				fileName: 'sf-emails-to-s3-exporter.jar',
				handler: 'com.gu.sf_emails_to_s3_exporter.Handler::handleRequest',
				memorySize: 512,
				timeout: Duration.seconds(900),
				description: 'Retrieves emails from Salesforce and saves as Json to S3',
				environment: {
					// The handler reads sys.env("Stage"); guCDK only injects uppercase STAGE.
					Stage: stage,
					bucketName: `emails-from-sf-${stage}`,
					sfApiVersion: 'v50.0',
					JAVA_TOOL_OPTIONS:
						'-Djdk.httpclient.allowRestrictedHeaders=host --add-opens=java.base/sun.net.www.protocol.https=ALL-UNNAMED --add-opens=java.base/java.net=ALL-UNNAMED',
				},
			},
		});

		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: [
					'secretsmanager:DescribeSecret',
					'secretsmanager:GetSecretValue',
				],
				resources: [
					'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Salesforce/ConnectedApp/AwsConnectorSandbox-jaCgRl',
					'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/Salesforce/ConnectedApp/SFEmailsToS3-6QJGTX',
					'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Salesforce/User/EmailsToS3APIUser-EbXFEb',
					'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/Salesforce/User/EmailsToS3APIUser-kGtUDC',
				],
			}),
		);
		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
			}),
		);
		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['s3:GetObject', 's3:PutObject'],
				resources: [`${bucketArn}/*`],
			}),
		);
		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['s3:ListBucket'],
				resources: [bucketArn, `${bucketArn}/*`],
			}),
		);
		lambda.addToRolePolicy(
			new PolicyStatement({
				sid: 'readDeployedArtefact',
				effect: Effect.ALLOW,
				actions: ['s3:GetObject'],
				resources: ['arn:aws:s3::*:membership-dist/*'],
			}),
		);

		const apiRole = new Role(this, 'S3IntegrationRole', {
			roleName: `emails-to-sf-api-${stage}-api-gateway-role`,
			assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
			description: 'Allows API Gateway to Read/Write/Delete from S3.',
			maxSessionDuration: Duration.seconds(3600),
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AmazonAPIGatewayPushToCloudWatchLogs',
				),
			],
		});
		apiRole.addToPolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
				resources: [`${bucketArn}/*`],
			}),
		);

		const api = new RestApi(this, 'ApiGateway', {
			restApiName: `import-emails-from-s3-to-sf-${stage}-api-gateway`,
			apiKeySourceType: ApiKeySourceType.HEADER,
			endpointConfiguration: { types: [EndpointType.EDGE] },
			cloudWatchRole: false,
			deployOptions: {
				stageName: stage,
				dataTraceEnabled: true,
				loggingLevel: MethodLoggingLevel.INFO,
				metricsEnabled: false,
				cachingEnabled: false,
				throttlingBurstLimit: 5000,
				throttlingRateLimit: 10000,
			},
		});

		const responseHeaders = {
			'method.response.header.Content-Length': false,
			'method.response.header.Content-Type': false,
			'method.response.header.Timestamp': false,
		};
		const integrationResponseHeaders = {
			'method.response.header.Content-Length':
				'integration.response.header.Content-Length',
			'method.response.header.Content-Type':
				'integration.response.header.Content-Type',
			'method.response.header.Timestamp': 'integration.response.header.Date',
		};

		const bucketResource = api.root.addResource('{bucketName}');
		const caseResource = bucketResource.addResource('{caseNumber}');

		caseResource.addMethod(
			'GET',
			new AwsIntegration({
				service: 's3',
				path: '{folder}/{item}',
				integrationHttpMethod: 'GET',
				options: {
					credentialsRole: apiRole,
					passthroughBehavior: PassthroughBehavior.WHEN_NO_MATCH,
					timeout: Duration.millis(29000),
					requestParameters: {
						'integration.request.path.folder': 'method.request.path.bucketName',
						'integration.request.path.item': 'method.request.path.caseNumber',
					},
					integrationResponses: [
						{
							statusCode: '200',
							selectionPattern: '2\\d{2}',
							responseParameters: integrationResponseHeaders,
						},
						{ statusCode: '400', selectionPattern: '4\\d{2}' },
						{ statusCode: '500', selectionPattern: '5\\d{2}' },
					],
				},
			}),
			{
				apiKeyRequired: true,
				requestParameters: {
					'method.request.path.bucketName': true,
					'method.request.path.caseNumber': true,
				},
				methodResponses: [
					{ statusCode: '200', responseParameters: responseHeaders },
					{ statusCode: '400', responseParameters: responseHeaders },
					{ statusCode: '500', responseParameters: responseHeaders },
				],
			},
		);

		bucketResource.addMethod(
			'POST',
			new AwsIntegration({
				service: 's3',
				subdomain: `emails-from-sf-${lowerCaseStage}`,
				path: '?delete',
				integrationHttpMethod: 'POST',
				options: {
					credentialsRole: apiRole,
					passthroughBehavior: PassthroughBehavior.WHEN_NO_MATCH,
					timeout: Duration.millis(29000),
					requestParameters: {
						'integration.request.header.x-amz-checksum-sha1':
							'method.request.header.x-amz-checksum-sha1',
						'integration.request.header.x-amz-sdk-checksum-algorithm':
							'method.request.header.x-amz-sdk-checksum-algorithm',
					},
					integrationResponses: [
						{
							statusCode: '200',
							selectionPattern: '2\\d{2}',
							responseParameters: integrationResponseHeaders,
						},
						{ statusCode: '400', selectionPattern: '4\\d{2}' },
						{ statusCode: '500', selectionPattern: '5\\d{2}' },
					],
				},
			}),
			{
				apiKeyRequired: true,
				requestParameters: {
					'method.request.header.x-amz-checksum-sha1': false,
					'method.request.header.x-amz-sdk-checksum-algorithm': false,
					'method.request.path.bucketName': true,
				},
				methodResponses: [
					{ statusCode: '200', responseParameters: responseHeaders },
					{ statusCode: '400', responseParameters: responseHeaders },
					{ statusCode: '500', responseParameters: responseHeaders },
				],
			},
		);

		const apiKey = api.addApiKey('ApiKey', {
			apiKeyName: `import-emails-from-s3-to-sf-${stage}-api-key`,
		});
		const usagePlan = api.addUsagePlan('UsagePlan', {
			name: `import-emails-from-s3-to-sf-${stage}-usage-plan`,
			apiStages: [{ api, stage: api.deploymentStage }],
		});
		usagePlan.addApiKey(apiKey);

		if (this.stage === 'PROD') {
			const alarms: Array<{
				id: string;
				metricName: string;
				alarmName: string;
				alarmDescription: string;
			}> = [
				{
					id: 'FailedS3WriteFileAlarm',
					metricName: 'failed_s3_write_file',
					alarmName: 'emails-from-sf failed when writing file to s3',
					alarmDescription:
						'Something went wrong when writing a file to S3 bucket emails-from-sf-PROD',
				},
				{
					id: 'FailedS3CheckFileExistsAlarm',
					metricName: 'failed_s3_check_file_exists',
					alarmName:
						'emails-from-sf failed when checking if a file exists in s3',
					alarmDescription:
						'Something went wrong when checking if a file exists in S3 bucket emails-from-sf-PROD',
				},
				{
					id: 'FailedS3GetFileAlarm',
					metricName: 'failed_s3_get_file',
					alarmName: 'emails-from-sf failed when getting file from s3',
					alarmDescription:
						'Something went wrong when getting file from S3 bucket emails-from-sf-PROD',
				},
				{
					id: 'FailedWritebackToSFRequestAlarm',
					metricName: 'failed_writeback_request_to_sf',
					alarmName: 'emails-from-sf failed request to Salesforce',
					alarmDescription:
						'Something went wrong writing successes back to Salesforce (Bad Request)',
				},
				{
					id: 'FailedWritebackToSFRecordAlarm',
					metricName: 'failed_writeback_to_sf_record',
					alarmName: 'emails-from-sf failed writeback to Salesforce record',
					alarmDescription:
						'Something went wrong writing success back to Salesforce record',
				},
				{
					id: 'FailedToRetrieveEmailsFromSalesforceAlarm',
					metricName: 'failed_to_get_records_from_sf',
					alarmName: 'emails-from-sf failed to retrieve emails from Salesforce',
					alarmDescription:
						'Something went wrong retrieving emails from Salesforce',
				},
				{
					id: 'FailedToAuthenticateWithSalesforceAlarm',
					metricName: 'failed_to_authenticate_with_sf',
					alarmName: 'emails-from-sf failed to authenticate with Salesforce',
					alarmDescription:
						'Something went wrong authenticating with Salesforce',
				},
			];

			alarms.forEach((alarm) => {
				new SrLambdaAlarm(this, alarm.id, {
					app: this.app,
					alarmName: alarm.alarmName,
					alarmDescription: alarm.alarmDescription,
					comparisonOperator:
						ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
					threshold: 1,
					evaluationPeriods: 1,
					datapointsToAlarm: 1,
					treatMissingData: TreatMissingData.NOT_BREACHING,
					lambdaFunctionNames: lambda.functionName,
					metric: new Metric({
						namespace: 's3-emails-from-sf',
						metricName: alarm.metricName,
						statistic: 'Sum',
						period: Duration.seconds(3600),
						dimensionsMap: { Stage: this.stage },
					}),
				});
			});
		}
	}
}
