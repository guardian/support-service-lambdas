import type { App } from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import {
	AttributeType,
	BillingMode,
	StreamViewType,
	Table,
	TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { SrApiLambda } from './cdk/SrApiLambda';
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

		secondaryUserTable.grantFullAccess(lambda);
	}
}
