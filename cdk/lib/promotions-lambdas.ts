import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { SrLambda } from './cdk/SrLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class PromotionsLambdas extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'promotions-lambdas' });

		const promoCampaignSyncLambda = new SrLambda(this, 'PromoCampaignSync', {
			nameSuffix: 'promo-campaign-sync',
			lambdaOverrides: {
				handler: 'handlers/promoCampaignSync.handler',
				environment: {
					STAGE: stage,
				},
			},
		});

		// We have to mock the table for the test run, otherwise we get the error "DynamoDB Streams must be enabled on the table promotions-lambdas-CODE/OldPromoCampaignTable"
		const oldPromoCampaignTable =
			process.env.NODE_ENV === 'test'
				? new dynamodb.Table(this, 'MockTable', {
						partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
						stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
					})
				: dynamodb.Table.fromTableName(
						this,
						'OldPromoCampaignTable',
						`MembershipSub-Campaigns-${stage}`,
					);

		promoCampaignSyncLambda.addEventSource(
			new DynamoEventSource(oldPromoCampaignTable, {
				startingPosition: StartingPosition.TRIM_HORIZON,
				batchSize: 5,
				maxBatchingWindow: Duration.seconds(10),
				bisectBatchOnError: true,
				retryAttempts: 3,
				reportBatchItemFailures: true,
				parallelizationFactor: 1,
			}),
		);

		oldPromoCampaignTable.grantStreamRead(promoCampaignSyncLambda);
	}
}
