import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration, Fn } from 'aws-cdk-lib';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
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

		const userBenefitsMeLambda = new GuLambdaFunction(
			this,
			`user-benefits-me-lambda`,
			{
				app,
				description:
					'An API Gateway triggered lambda generated in the support-service-lambdas repo',
				functionName: `user-benefits-me-${this.stage}`,
				fileName: `${app}.zip`,
				handler: 'index.benefitsMeHandler',
				initialPolicy: [supporterProductDataTablePolicy],
				runtime: nodeVersion,
				memorySize: 1024,
				timeout: Duration.seconds(300),
				environment: commonEnvironmentVariables,
			},
		);
		const userBenefitsIdentityIdLambda = new GuLambdaFunction(
			this,
			`user-benefits-identity-id-lambda`,
			{
				app,
				description:
					'An API Gateway triggered lambda generated in the support-service-lambdas repo',
				functionName: `user-benefits-identity-id-${this.stage}`,
				fileName: `${app}.zip`,
				handler: 'index.benefitsIdentityIdHandler',
				initialPolicy: [supporterProductDataTablePolicy],
				runtime: nodeVersion,
				memorySize: 1024,
				timeout: Duration.seconds(300),
				environment: commonEnvironmentVariables,
			},
		);
		const lambdaByPath = new GuApiGatewayWithLambdaByPath(this, {
			app,
			targets: [
				{
					// Auth is handled by the lambda which validates a JWT
					path: '/benefits/me',
					httpMethod: 'GET',
					lambda: userBenefitsMeLambda,
				},
				{
					path: '/benefits/{proxy+}',
					httpMethod: 'GET',
					lambda: userBenefitsIdentityIdLambda,
					apiKeyRequired: true,
				},
			],
			monitoringConfiguration: {
				http5xxAlarm: { tolerated5xxPercentage: 5 },
				snsTopicName: `alarms-handler-topic-${this.stage}`,
			},
		});

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`user-benefits-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new GuAlarm(this, 'ApiGateway4XXAlarmCDK', {
			app,
			alarmName: alarmName('API gateway 4XX response'),
			alarmDescription: alarmDescription(
				'User benefits received an invalid request',
			),
			evaluationPeriods: 1,
			threshold: 1,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			actionsEnabled: this.stage === 'PROD',
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new Metric({
				metricName: '4XXError',
				namespace: 'AWS/ApiGateway',
				statistic: 'Sum',
				period: Duration.seconds(300),
				dimensionsMap: {
					ApiName: lambdaByPath.api.restApiName,
				},
			}),
		});

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
			restApiId: lambdaByPath.api.restApiId,
			stage: lambdaByPath.api.deploymentStage.stageName,
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

		const s3InlinePolicy: Policy = new Policy(this, 'S3 inline policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`,
					],
				}),
			],
		});

		userBenefitsMeLambda.role?.attachInlinePolicy(s3InlinePolicy);
	}
}
