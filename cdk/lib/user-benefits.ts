import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration, Fn } from 'aws-cdk-lib';
import {
	CfnBasePathMapping,
	CfnDomainName,
	UsagePlan,
} from 'aws-cdk-lib/aws-apigateway';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { allowedOriginsForStage } from '../../handlers/user-benefits/src/cors';
import { nodeVersion } from './node-version';

export interface UserBenefitsProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	internalDomainName: string;
	publicDomainName: string;
	hostedZoneId: string;
	supporterProductDataTable: string;
}

export class UserBenefits extends GuStack {
	constructor(scope: App, id: string, props: UserBenefitsProps) {
		super(scope, id, props);

		const app = 'user-benefits';

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		const supporterProductDataTablePolicy = new PolicyStatement({
			actions: ['dynamodb:Query'],
			resources: [Fn.importValue(props.supporterProductDataTable)],
		});

		const commonLambdaProps = {
			app,
			fileName: `${app}.zip`,
			initialPolicy: [supporterProductDataTablePolicy],
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
		};
		const userBenefitsMeLambda = new GuLambdaFunction(
			this,
			`user-benefits-me-lambda`,
			{
				description:
					'An API Gateway triggered lambda to get the benefits of a user identified by a JWT',
				functionName: `user-benefits-me-${this.stage}`,
				loggingFormat: LoggingFormat.TEXT,
				handler: 'index.benefitsMeHandler',
				...commonLambdaProps,
			},
		);
		const userBenefitsIdentityIdLambda = new GuLambdaFunction(
			this,
			`user-benefits-identity-id-lambda`,
			{
				description:
					'An API Gateway triggered lambda to get the benefits of the user identified in the request path',
				functionName: `user-benefits-identity-id-${this.stage}`,
				loggingFormat: LoggingFormat.TEXT,
				handler: 'index.benefitsIdentityIdHandler',
				...commonLambdaProps,
			},
		);
		const userBenefitsListLambda = new GuLambdaFunction(
			this,
			`user-benefits-list-lambda`,
			{
				description:
					'An API Gateway triggered lambda to return the full list of benefits for each product in html or json format',
				functionName: `user-benefits-list-${this.stage}`,
				loggingFormat: LoggingFormat.TEXT,
				handler: 'index.benefitsListHandler',
				...commonLambdaProps,
			},
		);
		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app,
			targets: [
				{
					// Auth is handled by the lambda which validates a JWT
					path: '/benefits/me',
					httpMethod: 'GET',
					lambda: userBenefitsMeLambda,
				},
				{
					path: '/benefits/{identityId+}',
					httpMethod: 'GET',
					lambda: userBenefitsIdentityIdLambda,
					apiKeyRequired: true,
				},
				{
					path: '/benefits/list',
					httpMethod: 'GET',
					lambda: userBenefitsListLambda,
				},
			],
			defaultCorsPreflightOptions: {
				allowHeaders: ['*'],
				allowMethods: ['GET'],
				allowOrigins: allowedOriginsForStage(this.stage),
			},
			monitoringConfiguration: {
				http5xxAlarm: { tolerated5xxPercentage: 5 },
				snsTopicName: `alarms-handler-topic-${this.stage}`,
			},
		});

		// ---- API Key ---- //
		const usagePlan = new UsagePlan(this, 'UserBenefitsUsagePlan', {
			name: `user-benefits-api-usage-plan-${this.stage}`,
			apiStages: [
				{
					api: apiGateway.api,
					stage: apiGateway.api.deploymentStage,
				},
			],
		});
		const apiKey = apiGateway.api.addApiKey(`${app}-api-key-${this.stage}`, {
			apiKeyName: `${app}-api-key-${this.stage}`,
		});
		usagePlan.addApiKey(apiKey);

		// ---- DNS ---- //
		const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${props.certificateId}`;
		const cfnDomainName = new CfnDomainName(this, 'DomainName', {
			domainName: props.internalDomainName,
			regionalCertificateArn: certificateArn,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(this, 'BasePathMapping', {
			domainName: cfnDomainName.ref,
			restApiId: apiGateway.api.restApiId,
			stage: apiGateway.api.deploymentStage.stageName,
		});

		new CfnRecordSet(this, 'DNSRecord', {
			name: props.internalDomainName,
			type: 'CNAME',
			hostedZoneId: props.hostedZoneId,
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});

		new GuCname(this, 'NS1 DNS entry', {
			app: app,
			domainName: props.publicDomainName,
			ttl: Duration.hours(1),
			resourceRecord: 'guardian.map.fastly.net',
		});
	}
}
