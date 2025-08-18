import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
	CfnBasePathMapping,
	CfnDomainName,
} from 'aws-cdk-lib/aws-apigateway';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { nodeVersion } from './node-version';

export interface StripeDisputesProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	internalDomainName: string;
	publicDomainName: string;
	hostedZoneId: string;
}

export class StripeDisputes extends GuStack {
	constructor(scope: App, id: string, props: StripeDisputesProps) {
		super(scope, id, props);

		const app = 'stripe-disputes';

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		// Create DynamoDB table for storing dispute records
		const disputeRecordsTable = new Table(this, 'DisputeRecordsTable', {
			tableName: `stripe-dispute-records-${this.stage}`,
			partitionKey: {
				name: 'disputeId',
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: this.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			pointInTimeRecovery: this.stage === 'PROD',
		});

		// Create DynamoDB table for idempotency
		const idempotencyTable = new Table(this, 'IdempotencyTable', {
			tableName: `stripe-dispute-idempotency-${this.stage}`,
			partitionKey: {
				name: 'eventId',
				type: AttributeType.STRING,
			},
			billingMode: BillingMode.PAY_PER_REQUEST,
			removalPolicy: this.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
			timeToLiveAttribute: 'ttl',
		});

		// DynamoDB permissions
		const dynamoDbPolicy = new PolicyStatement({
			actions: [
				'dynamodb:GetItem',
				'dynamodb:PutItem',
				'dynamodb:UpdateItem',
				'dynamodb:Query',
				'dynamodb:Scan',
			],
			resources: [
				disputeRecordsTable.tableArn,
				idempotencyTable.tableArn,
			],
		});

		// SSM Parameter Store permissions for Stripe webhook secret
		const ssmPolicy = new PolicyStatement({
			actions: [
				'ssm:GetParameter',
				'ssm:GetParameters',
				'ssm:GetParametersByPath',
			],
			resources: [
				`arn:aws:ssm:${this.region}:${this.account}:parameter/${this.stage}/support/stripe-disputes/*`,
			],
		});

		// Secrets Manager permissions (if needed for API keys)
		const secretsPolicy = new PolicyStatement({
			actions: [
				'secretsmanager:GetSecretValue',
			],
			resources: [
				`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/support/stripe-disputes/*`,
			],
		});

		const commonLambdaProps = {
			app,
			fileName: `${app}.zip`,
			initialPolicy: [dynamoDbPolicy, ssmPolicy, secretsPolicy],
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(30),
			environment: {
				...commonEnvironmentVariables,
				DISPUTE_RECORDS_TABLE: disputeRecordsTable.tableName,
				IDEMPOTENCY_TABLE: idempotencyTable.tableName,
			},
		};

		const stripeWebhookLambda = new GuLambdaFunction(
			this,
			`stripe-disputes-webhook-lambda`,
			{
				description:
					'Lambda function to handle Stripe dispute webhook events',
				functionName: `stripe-disputes-${this.stage}`,
				loggingFormat: LoggingFormat.JSON,
				handler: 'index.stripeDisputesHandler',
				...commonLambdaProps,
			},
		);

		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app,
			targets: [
				{
					path: '/stripe/webhook',
					httpMethod: 'POST',
					lambda: stripeWebhookLambda,
				},
			],
			defaultCorsPreflightOptions: {
				allowHeaders: ['*'],
				allowMethods: ['POST'],
				allowOrigins: ['*'],
			},
			monitoringConfiguration: {
				http5xxAlarm: { tolerated5xxPercentage: 5 },
				snsTopicName: `alarms-handler-topic-${this.stage}`,
			},
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