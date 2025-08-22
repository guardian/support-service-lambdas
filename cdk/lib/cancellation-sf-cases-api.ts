import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
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

export class CancellationSfCasesApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'cancellation-sf-cases-api';
		const nameWithStage = `${app}-${this.stage}`;

		// Domain mapping based on stage
		const domainName =
			this.stage === 'PROD'
				? 'cancellation-sf-cases.support.guardianapis.com'
				: 'cancellation-sf-cases-code.support.guardianapis.com';

		// Lambda function
		const lambda = new GuLambdaFunction(this, `${app}-lambda`, {
			description:
				'manage-frontend used to create/update SalesForce cases for self service cancellation tracking',
			functionName: nameWithStage,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.jar`,
			handler: 'com.gu.cancellation.sf_cases.Handler::handle',
			runtime: Runtime.JAVA_21,
			architecture: Architecture.ARM_64,
			memorySize: 1536,
			timeout: Duration.seconds(300),
			environment: {
				Stage: this.stage,
			},
			app: app,
		});

		// Add S3 access policy for private credentials
		const s3Policy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['s3:GetObject'],
			resources: [
				`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/*`,
			],
		});
		lambda.role?.addToPrincipalPolicy(s3Policy);

		// API Gateway with proxy configuration - create multiple targets for all methods
		const api = new GuApiGatewayWithLambdaByPath(this, {
			app,
			monitoringConfiguration: { noMonitoring: true },
			targets: [
				// Root path methods
				{
					path: '/',
					httpMethod: 'GET',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/',
					httpMethod: 'POST',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/',
					httpMethod: 'PUT',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/',
					httpMethod: 'DELETE',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/',
					httpMethod: 'PATCH',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/',
					httpMethod: 'HEAD',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/',
					httpMethod: 'OPTIONS',
					lambda: lambda,
					apiKeyRequired: true,
				},
				// Proxy path methods
				{
					path: '/{proxy+}',
					httpMethod: 'GET',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/{proxy+}',
					httpMethod: 'POST',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/{proxy+}',
					httpMethod: 'PUT',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/{proxy+}',
					httpMethod: 'DELETE',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/{proxy+}',
					httpMethod: 'PATCH',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/{proxy+}',
					httpMethod: 'HEAD',
					lambda: lambda,
					apiKeyRequired: true,
				},
				{
					path: '/{proxy+}',
					httpMethod: 'OPTIONS',
					lambda: lambda,
					apiKeyRequired: true,
				},
			],
		});

		// API Key and Usage Plan
		const usagePlan = new UsagePlan(this, 'CancellationSFCasesApiUsagePlan', {
			name: 'cancellation-sf-cases-api',
			apiStages: [
				{
					api: api.api,
					stage: api.api.deploymentStage,
				},
			],
		});

		const apiKey = new ApiKey(this, 'CancellationSFCasesApiKey', {
			apiKeyName: `cancellation-sf-cases-api-key-${this.stage}`,
			description: 'Used by manage-frontend',
			enabled: true,
		});

		new CfnUsagePlanKey(this, 'CancellationSFCasesApiUsagePlanKey', {
			keyId: apiKey.keyId,
			keyType: 'API_KEY',
			usagePlanId: usagePlan.usagePlanId,
		});

		// Custom Domain
		const cfnDomainName = new CfnDomainName(
			this,
			'CancellationSFCasesApiDomainName',
			{
				regionalCertificateArn: `arn:aws:acm:${this.region}:${this.account}:certificate/b384a6a0-2f54-4874-b99b-96eeff96c009`,
				domainName: domainName,
				endpointConfiguration: {
					types: ['REGIONAL'],
				},
			},
		);

		new CfnBasePathMapping(this, 'CancellationSFCasesApiBasePathMapping', {
			restApiId: api.api.restApiId,
			domainName: cfnDomainName.ref,
			stage: api.api.deploymentStage.stageName,
		});

		// DNS Record
		new CfnRecordSet(this, 'CancellationSFCasesApiDNSRecord', {
			hostedZoneName: 'support.guardianapis.com.',
			name: domainName,
			type: 'CNAME',
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});

		// 5XX Error Alarm (only for PROD)
		if (this.stage === 'PROD') {
			new GuAlarm(this, '5xxApiAlarm', {
				app,
				alarmName: `5XX from ${nameWithStage}`,
				alarmDescription: `5XX errors from ${nameWithStage} API Gateway`,
				threshold: 1,
				evaluationPeriods: 1,
				snsTopicName: `alarms-handler-topic-${this.stage}`,
				actionsEnabled: true,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					statistic: 'Sum',
					period: Duration.seconds(3600),
					dimensionsMap: {
						ApiName: nameWithStage,
						Stage: this.stage,
					},
				}),
			});
		}
	}
}
