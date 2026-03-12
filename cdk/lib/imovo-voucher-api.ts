import type { App } from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
	AttributeType,
	BillingMode,
	Table,
	TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AllowGetSecretValuePolicy, AllowSqsSendPolicy } from './cdk/policies';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const imovoApiBaseUrl: Record<SrStageNames, string> = {
	CODE: 'https://imovocoreapi.tstpaypoint.services',
	PROD: 'https://imovocoreapi.paypoint.services',
};

const identityAccountId = '942464564246';

export class ImovoVoucherApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'imovo-voucher-api' });

		const vpc = Vpc.fromVpcAttributes(this, 'MembershipVpc', {
			vpcId: 'vpc-e6e00183',
			availabilityZones: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
			privateSubnetIds: [
				'subnet-cb91ae8d',
				'subnet-a7b74ac2',
				'subnet-179e8063',
			],
		});

		const securityGroup = new SecurityGroup(this, 'LambdaSecurityGroup', {
			vpc,
			description: `Security group for imovo-voucher-api-${this.stage} lambda`,
			allowAllOutbound: true,
		});

		const voucherTable = new Table(this, 'VoucherTable', {
			tableName: `imovo-voucher-api-vouchers-${this.stage}`,
			billingMode: BillingMode.PAY_PER_REQUEST,
			partitionKey: {
				name: 'identityId',
				type: AttributeType.STRING,
			},
			sortKey: {
				name: 'requestTimestamp',
				type: AttributeType.STRING,
			},
			pointInTimeRecoverySpecification: {
				pointInTimeRecoveryEnabled: true,
			},
			encryption: TableEncryption.AWS_MANAGED,
			removalPolicy:
				this.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
		});

		const lambda = new SrSqsLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'Processes voucher requests from SQS, calls i-movo API, and sends confirmation emails via Braze',
				timeout: Duration.seconds(30),
				vpc,
				vpcSubnets: { subnets: vpc.privateSubnets },
				securityGroups: [securityGroup],
				environment: {
					IMOVO_API_BASE_URL: imovoApiBaseUrl[stage],
					VOUCHER_TABLE_NAME: voucherTable.tableName,
				},
			},
			monitoring: {
				errorImpact:
					'Users may not receive their i-movo reward vouchers. Check DLQ for failed messages.',
			},
			maxReceiveCount: 3,
			visibilityTimeout: Duration.seconds(60),
		});

		voucherTable.grantWriteData(lambda);

		lambda.inputQueue.addToResourcePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				principals: [new ServicePrincipal('sns.amazonaws.com')],
				actions: ['sqs:SendMessage'],
				resources: [lambda.inputQueue.queueArn],
				conditions: {
					ArnEquals: {
						'aws:SourceArn': `arn:aws:sns:${this.region}:${identityAccountId}:identity-identity-gateway-${stage}-PrintPromoTopic`,
					},
				},
			}),
		);

		lambda.addPolicies(
			new AllowGetSecretValuePolicy(
				this,
				'Allow Secrets Manager i-movo API key',
				'imovo-voucher-api/api-key-*',
			),
			AllowSqsSendPolicy.createWithId(
				this,
				'Allow SQS SendMessage to Braze Emails Queue',
				'braze-emails',
			),
		);
	}
}
