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

		const oldPromoCampaignTable = dynamodb.Table.fromTableAttributes(
			this,
			'OldPromoCampaignTable',
			{
				tableArn: `arn:aws:dynamodb:${this.region}:${this.account}:table/MembershipSub-Campaigns-${stage}`,
				tableStreamArn: `arn:aws:dynamodb:${this.region}:${this.account}:table/MembershipSub-Campaigns-${stage}/stream/*`,
			},
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
