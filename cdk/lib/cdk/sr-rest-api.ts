import { GuGetDistributablePolicy } from '@guardian/cdk/lib/constructs/iam';
import { Duration } from 'aws-cdk-lib';
import {
	ApiKeySourceType,
	CfnBasePathMapping,
	CfnDomainName,
} from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { certForStack } from '../constants';
import { SrApiLambda } from './sr-lambda';
import { SrLambdaAlarm } from './sr-lambda-alarm';
import type { SrStack } from './sr-stack';

export interface SrRestApiProps {
	lambdaDesc: string;
	alarmImpact: string;
	gatewayDescription?: string;
}

export class SrRestApi {
	readonly lambda: SrApiLambda;

	constructor(scope: SrStack, props: SrRestApiProps) {
		const app = scope.app;
		const nameWithStage = `${app}-${scope.stage}`;

		// ---- API-triggered lambda functions ---- //
		const lambda = new SrApiLambda(scope, `${app}-lambda`, {
			description: props.lambdaDesc,
			functionName: nameWithStage,
			timeout: Duration.seconds(300),
			monitoringConfiguration: {
				noMonitoring: true, // There is a threshold alarm defined below
			},
			app,
			api: {
				id: nameWithStage,
				restApiName: nameWithStage,
				description:
					props.gatewayDescription ??
					`API Gateway endpoint for the ${nameWithStage} lambda`,
				proxy: true,
				deployOptions: {
					stageName: scope.stage,
				},
				apiKeySourceType: ApiKeySourceType.HEADER,
				defaultMethodOptions: {
					apiKeyRequired: true,
				},
			},
		});
		this.lambda = lambda;

		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: nameWithStage,
			description: `REST endpoints for ${app}`,
			apiStages: [
				{
					stage: lambda.api.deploymentStage,
					api: lambda.api,
				},
			],
		});

		// create api key
		const apiKey = lambda.api.addApiKey(`${app}-key-${scope.stage}`, {
			apiKeyName: `${app}-key-${scope.stage}`,
		});

		// associate api key to plan
		usagePlan.addApiKey(apiKey);

		lambda.role?.attachInlinePolicy(new GuGetDistributablePolicy(scope, scope));

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`${nameWithStage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		const isProd = scope.stage === 'PROD';
		if (isProd) {
			new SrLambdaAlarm(scope, 'ApiGateway5XXAlarm', {
				app,
				alarmName: alarmName('API gateway 5XX response'),
				alarmDescription: alarmDescription(props.alarmImpact),
				evaluationPeriods: 1,
				threshold: 1,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					statistic: 'Sum',
					period: Duration.seconds(300),
					dimensionsMap: {
						ApiName: nameWithStage,
					},
				}),
				lambdaFunctionNames: lambda.functionName,
			});
		}

		const cert = certForStack[scope.stack];
		// ---- DNS ---- //
		const certificateArn = `arn:aws:acm:eu-west-1:${scope.account}:certificate/${cert.certificateId}`;
		const domainName = `${app}${isProd ? '' : '-code'}.${cert.domainName}`;

		const cfnDomainName = new CfnDomainName(scope, 'DomainName', {
			domainName,
			regionalCertificateArn: certificateArn,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(scope, 'BasePathMapping', {
			domainName: cfnDomainName.ref,
			restApiId: lambda.api.restApiId,
			stage: lambda.api.deploymentStage.stageName,
		});

		new CfnRecordSet(scope, 'DNSRecord', {
			name: domainName,
			type: 'CNAME',
			hostedZoneId: cert.hostedZoneId,
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});
	}
}
