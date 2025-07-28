import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ApiKey,
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

export class HolidayStopApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'holiday-stop-api';
		const functionName = `${app}-${this.stage}`;

		// Map stage-specific configurations
		const stageConfig: {
			domainName: string;
			fulfilmentDatesBucketUrn: string;
		} = {
			CODE: {
				domainName: 'holiday-stop-api-code.support.guardianapis.com',
				fulfilmentDatesBucketUrn:
					'arn:aws:s3:::fulfilment-date-calculator-code/*',
			},
			PROD: {
				domainName: 'holiday-stop-api.support.guardianapis.com',
				fulfilmentDatesBucketUrn:
					'arn:aws:s3:::fulfilment-date-calculator-prod/*',
			},
		}[this.stage] ?? {
			domainName: 'holiday-stop-api-code.support.guardianapis.com',
			fulfilmentDatesBucketUrn:
				'arn:aws:s3:::fulfilment-date-calculator-code/*',
		};

		// Create the main API Lambda
		const holidayStopApiLambda = new GuLambdaFunction(this, 'HolidayStopApi', {
			fileName: 'holiday-stop-api.jar',
			handler: 'com.gu.holiday_stops.Handler::apply',
			runtime: Runtime.JAVA_21,
			memorySize: 1536,
			timeout: Duration.minutes(5),
			environment: {
				Stage: this.stage,
			},
			app: app,
			functionName: functionName,
			architecture: Architecture.ARM_64,
			loggingFormat: LoggingFormat.TEXT,
		});

		// Add S3 permissions for private credentials
		holidayStopApiLambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['s3:GetObject'],
				resources: [
					`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/*`,
				],
			}),
		);

		// Add S3 permissions for fulfilment dates calculator bucket
		holidayStopApiLambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['s3:GetObject'],
				resources: [stageConfig.fulfilmentDatesBucketUrn],
			}),
		);

		// Create API Gateway with all endpoints
		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app: app,
			monitoringConfiguration: {
				noMonitoring: true, // We'll create custom alarms
			},
			targets: [
				{
					path: '/potential/{subscriptionName}',
					httpMethod: 'GET',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
				{
					path: '/hsr',
					httpMethod: 'POST',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
				{
					path: '/bulk-hsr',
					httpMethod: 'POST',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
				{
					path: '/hsr/{subscriptionName}',
					httpMethod: 'GET',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
				{
					path: '/hsr/{subscriptionName}/{holidayStopRequestId}',
					httpMethod: 'DELETE',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
				{
					path: '/hsr/{subscriptionName}/{holidayStopRequestId}',
					httpMethod: 'PATCH',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
				{
					path: '/hsr/{subscriptionName}/cancel',
					httpMethod: 'GET',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
				{
					path: '/hsr/{subscriptionName}/cancel',
					httpMethod: 'POST',
					lambda: holidayStopApiLambda,
					apiKeyRequired: true,
				},
			],
		});

		// Create usage plan and API key
		const usagePlan = new UsagePlan(this, 'HolidayStopApiUsagePlan', {
			name: 'holiday-stop-api',
			description: 'REST endpoints for holiday-stop-api',
			apiStages: [
				{
					stage: apiGateway.api.deploymentStage,
					api: apiGateway.api,
				},
			],
		});

		const apiKey = new ApiKey(this, 'HolidayStopApiKey', {
			apiKeyName: `${app}-key-${this.stage}`,
			description: 'Used by manage-frontend',
		});

		new CfnUsagePlanKey(this, 'HolidayStopApiUsagePlanKey', {
			keyId: apiKey.keyId,
			keyType: 'API_KEY',
			usagePlanId: usagePlan.usagePlanId,
		});

		// Custom domain name
		const domainName = new CfnDomainName(this, 'HolidayStopApiDomainName', {
			regionalCertificateArn: `arn:aws:acm:${this.region}:${this.account}:certificate/b384a6a0-2f54-4874-b99b-96eeff96c009`,
			domainName: stageConfig.domainName,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(this, 'HolidayStopApiBasePathMapping', {
			restApiId: apiGateway.api.restApiId,
			domainName: domainName.ref,
			stage: this.stage,
		});

		// DNS record
		new CfnRecordSet(this, 'HolidayStopApiDNSRecord', {
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
				alarmName: `5XX rate from ${functionName}`,
				alarmDescription:
					'Holiday stop API exceeded the allowed 5XX error rate',
				evaluationPeriods: 1,
				threshold: 5,
				comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					dimensionsMap: {
						ApiName: functionName,
						Stage: this.stage,
					},
					statistic: 'Sum',
					period: Duration.hours(1),
				}),
				lambdaFunctionNames: holidayStopApiLambda.functionName,
			});
		}
	}
}
