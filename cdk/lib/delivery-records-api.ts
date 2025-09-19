import { GuApiLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ApiKey,
	ApiKeySourceType,
	CfnBasePathMapping,
	CfnDomainName,
	CfnUsagePlanKey,
	UsagePlan,
} from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, LoggingFormat, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';

export class DeliveryRecordsApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'delivery-records-api';
		const functionName = `${app}-${this.stage}`;

		// Map stage-specific configurations
		const stageConfig: {
			domainName: string;
			apiName: string;
		} = {
			CODE: {
				domainName: 'delivery-records-api-code.support.guardianapis.com',
				apiName: 'delivery-records-api-CODE',
			},
			PROD: {
				domainName: 'delivery-records-api.support.guardianapis.com',
				apiName: 'delivery-records-api-PROD',
			},
		}[this.stage] ?? {
			domainName: 'delivery-records-api-code.support.guardianapis.com',
			apiName: 'delivery-records-api-CODE',
		};

		// Create the main API Lambda with proxy pattern
		const deliveryRecordsApiLambda = new GuApiLambda(
			this,
			'DeliveryRecordsApi',
			{
				fileName: 'delivery-records-api.jar',
				handler: 'com.gu.delivery_records_api.Handler::handle',
				runtime: Runtime.JAVA_21,
				memorySize: 1536,
				timeout: Duration.minutes(5),
				environment: {
					Stage: this.stage,
				},
				app: app,
				api: {
					id: functionName,
					restApiName: stageConfig.apiName,
					description: 'api for accessing delivery records in salesforce',
					proxy: true, // Uses {proxy+} pattern like the original CloudFormation
					deployOptions: {
						stageName: this.stage,
					},
					apiKeySourceType: ApiKeySourceType.HEADER,
					defaultMethodOptions: {
						apiKeyRequired: true,
					},
				},
				monitoringConfiguration: {
					noMonitoring: true, // We'll create custom alarms
				},
				architecture: Architecture.ARM_64,
				loggingFormat: LoggingFormat.TEXT,
			},
		);

		// Add S3 permissions for private credentials
		deliveryRecordsApiLambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['s3:GetObject'],
				resources: [
					`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/*`,
				],
			}),
		);

		// Create API usage plan and key
		const usagePlan = new UsagePlan(this, 'DeliveryRecordsApiUsagePlan', {
			name: 'delivery-records-api',
			apiStages: [
				{
					stage: deliveryRecordsApiLambda.api.deploymentStage,
					api: deliveryRecordsApiLambda.api,
				},
			],
		});

		const apiKey = new ApiKey(this, 'DeliveryRecordsApiKey', {
			apiKeyName: `${app}-key-${this.stage}`,
			description: 'Used by manage-frontend',
		});

		new CfnUsagePlanKey(this, 'DeliveryRecordsApiUsagePlanKey', {
			keyId: apiKey.keyId,
			keyType: 'API_KEY',
			usagePlanId: usagePlan.usagePlanId,
		});

		// Custom domain name
		const domainName = new CfnDomainName(this, 'DeliveryRecordsApiDomainName', {
			regionalCertificateArn: `arn:aws:acm:${this.region}:${this.account}:certificate/b384a6a0-2f54-4874-b99b-96eeff96c009`,
			domainName: stageConfig.domainName,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(this, 'DeliveryRecordsApiBasePathMapping', {
			restApiId: deliveryRecordsApiLambda.api.restApiId,
			domainName: domainName.ref,
			stage: this.stage,
		});

		// DNS record
		new CfnRecordSet(this, 'DeliveryRecordsApiDNSRecord', {
			hostedZoneName: 'support.guardianapis.com.',
			name: stageConfig.domainName,
			type: 'CNAME',
			ttl: '120',
			resourceRecords: [domainName.attrRegionalDomainName],
		});

		// Create PROD-only CloudWatch alarm for 5XX errors
		if (this.stage === 'PROD') {
			new SrLambdaAlarm(this, '5XXApiAlarm', {
				app,
				alarmName: `5XX rate from ${stageConfig.apiName}`,
				alarmDescription:
					'Delivery records API exceeded the allowed 5XX error rate',
				evaluationPeriods: 1,
				threshold: 2,
				comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					dimensionsMap: {
						ApiName: stageConfig.apiName,
						Stage: this.stage,
					},
					statistic: 'Sum',
					period: Duration.hours(1),
				}),
				lambdaFunctionNames: deliveryRecordsApiLambda.functionName,
			});
		}
	}
}
