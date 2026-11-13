import type { App } from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnAlarm } from 'aws-cdk-lib/aws-cloudwatch';
import {
	AttributeType,
	BillingMode,
	StreamViewType,
	Table,
	TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { metricNamespace } from '../../modules/aws/src/cloudwatch';
import {
	AllowPutMetricPolicy,
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowSupporterProductDataDeletePolicy,
	AllowSupporterProductDataQueryPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrEventBusLambda } from './cdk/SrEventBusLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class MultipleAccountApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'multiple-account-api' });

		const app = 'multiple-account';

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'A lambda that provides an API to manage multiple accounts',
			},
			monitoring: {
				errorImpact: 'The multiple account system is experiencing errors',
			},
		});

		const zuoraPolicy = new AllowZuoraOAuthSecretsPolicy(this);
		lambda.addPolicies(zuoraPolicy);
		lambda.addPolicies(new AllowS3CatalogReadPolicy(this));
		lambda.addPolicies(new AllowSupporterProductDataQueryPolicy(this));
		lambda.addPolicies(new AllowSupporterProductDataDeletePolicy(this));
		lambda.addPolicies(
			AllowSqsSendPolicy.create(
				this,
				'supporter-product-data',
				'braze-emails',
				'soft-opt-in-consent-setter-queue',
			),
		);
		lambda.addPolicies(new AllowPutMetricPolicy(this, metricNamespace));

		const invitationTable = new Table(this, 'InvitationTable', {
			tableName: `${app}-invitation-${this.stage}`,
			billingMode: BillingMode.PAY_PER_REQUEST,
			partitionKey: { name: 'subscriptionName', type: AttributeType.STRING },
			sortKey: { name: 'invitationCode', type: AttributeType.STRING },
			timeToLiveAttribute: 'expiryDate',
			encryption: TableEncryption.AWS_MANAGED,
			stream: StreamViewType.NEW_AND_OLD_IMAGES,
			removalPolicy:
				this.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
		});

		invitationTable.addGlobalSecondaryIndex({
			indexName: 'invitationCode-index',
			partitionKey: { name: 'invitationCode', type: AttributeType.STRING },
		});

		invitationTable.grantFullAccess(lambda);

		const secondaryUserTable = new Table(this, 'SecondaryUserTable', {
			tableName: `${app}-secondary-user-${this.stage}`,
			billingMode: BillingMode.PAY_PER_REQUEST,
			partitionKey: { name: 'subscriptionName', type: AttributeType.STRING },
			sortKey: { name: 'secondaryIdentityId', type: AttributeType.STRING },
			timeToLiveAttribute: 'expiryDate',
			encryption: TableEncryption.AWS_MANAGED,
			stream: StreamViewType.NEW_AND_OLD_IMAGES,
			removalPolicy:
				this.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
		});

		secondaryUserTable.addGlobalSecondaryIndex({
			indexName: 'secondaryIdentityId-index',
			partitionKey: { name: 'secondaryIdentityId', type: AttributeType.STRING },
		});

		secondaryUserTable.addGlobalSecondaryIndex({
			indexName: 'invitationCode-index',
			partitionKey: { name: 'invitationCode', type: AttributeType.STRING },
		});

		secondaryUserTable.grantFullAccess(lambda);

		const cancellationsListenerLambda = new SrEventBusLambda(
			this,
			'CancellationsListenerLambda',
			{
				bus: 'cancellations-bus',
				nameSuffix: 'cancellation',
				lambdaOverrides: {
					description:
						'Sends secondary-user cancellation emails when a subscription with multiple accounts is cancelled',
				},
				monitoring: {
					errorImpact:
						'A secondary user may not receive a cancellation email when their subscription is cancelled',
				},
				maxReceiveCount: 3,
			},
		);

		cancellationsListenerLambda.addPolicies(zuoraPolicy);
		cancellationsListenerLambda.addPolicies(
			AllowSqsSendPolicy.createWithId(
				this,
				'CancellationsListenerLambdaSqsSendPolicy',
				'braze-emails',
			),
		);

		secondaryUserTable.grantReadData(cancellationsListenerLambda);

		new CfnAlarm(this, 'failedMultipleAccountsEmailTrigger', {
			alarmActions: [
				`arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`,
			],
			alarmName: `The ${this.app}-${this.stage} lambda failed to trigger an email`,
			alarmDescription:
				`The ${this.app}-${this.stage} lambda failed to trigger an email so a user will not receive a notification about an action. ` +
				`See the lambda logs for details.`,
			comparisonOperator: 'GreaterThanOrEqualToThreshold',
			dimensions: [
				{
					name: 'Stage',
					value: this.stage,
				},
				{
					name: 'App',
					value: this.app,
				},
			],
			actionsEnabled: this.stage === 'PROD',
			evaluationPeriods: 1,
			metricName: 'multiple-accounts-email-trigger-failure',
			namespace: metricNamespace,
			period: 60, // 1 minute
			statistic: 'Sum',
			threshold: 1,
			treatMissingData: 'notBreaching',
		});
	}
}
