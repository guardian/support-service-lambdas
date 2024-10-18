---
# This template creates a CDK definition for the new lambda

to: cdk/lib/<%=lambdaName%>.ts
sh: git add cdk/lib/<%=lambdaName%>.ts
---
<% PascalCase = h.changeCase.pascal(lambdaName) %>
import { GuApiLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
<% if (includeApiKey === 'Y'){ %>
import { ApiKeySourceType } from 'aws-cdk-lib/aws-apigateway';
<% } %>
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { nodeVersion } from './node-version';

export interface <%= PascalCase %>Props extends GuStackProps {
	stack: string;
	stage: string;
	domainName: string;
}

export class <%= PascalCase %> extends GuStack {
	constructor(scope: App, id: string, props: <%= PascalCase %>Props) {
		super(scope, id, props);

		const app = '<%= lambdaName %>';
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		// ---- API-triggered lambda functions ---- //
		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description:
				'An API Gateway triggered lambda generated in the support-service-lambdas repo',
			functionName: nameWithStage,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			// Create an alarm
			monitoringConfiguration: {
				http5xxAlarm: { tolerated5xxPercentage: 5 },
				snsTopicName: `alarms-handler-topic-${this.stage}`,
			},
			app: app,
			api: {
				id: nameWithStage,
				restApiName: nameWithStage,
				description: 'API Gateway created by CDK',
				proxy: true,
				deployOptions: {
					stageName: this.stage,
				},
			<% if (includeApiKey === 'Y'){ %>
				apiKeySourceType: ApiKeySourceType.HEADER,
				defaultMethodOptions: {
					apiKeyRequired: true,
				},
			<% } %>
			},
		});
	<% if (includeApiKey === 'Y'){ %>
		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: nameWithStage,
			description: 'REST endpoints for <%= lambdaName %>>',
			apiStages: [
				{
					stage: lambda.api.deploymentStage,
					api: lambda.api,
				},
			],
		});

		// create api key
		const apiKey = lambda.api.addApiKey(`${app}-key-${this.stage}`, {
		apiKeyName: `${app}-key-${this.stage}`,
		});

		// associate api key to plan
		usagePlan.addApiKey(apiKey);
	<% } %>

		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`<%= h.changeCase.kebabCase(lambdaName).toUpperCase() %>-${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new GuAlarm(this, 'ApiGateway4XXAlarmCDK', {
			app,
			alarmName: alarmName('API gateway 4XX response'),
			alarmDescription: alarmDescription(
				'<%= h.changeCase.sentenceCase(lambdaName) %> received an invalid request',
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
					ApiName: nameWithStage,
				},
			}),
		});

		new GuCname(this, `NS1 DNS entry for ${props.domainName}`, {
			app: app,
			domainName: props.domainName,
			ttl: Duration.hours(1),
			resourceRecord: 'guardian.map.fastly.net',
		});

		const s3InlinePolicy: Policy = new Policy(this, 'S3 inline policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`],
				}),
			],
		});

		lambda.role?.attachInlinePolicy(s3InlinePolicy);
	}
}
