import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { SrLambda } from './cdk/SrLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const app = 'promotions-lambdas';

interface Props {
	oldPromoCampaignStreamLabel: string;
}

export class PromotionsLambdas extends SrStack {
	constructor(scope: App, stage: SrStageNames, props: Props) {
		super(scope, { stage, app });

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
				tableName: `MembershipSub-Campaigns-${stage}`,
				tableStreamArn: `arn:aws:dynamodb:${this.region}:${this.account}:table/MembershipSub-Campaigns-${stage}/stream/${props.oldPromoCampaignStreamLabel}`,
			},
		);

		const newPromoCampaignTable = dynamodb.Table.fromTableName(
			this,
			'NewPromoCampaignTable',
			`support-admin-console-promo-campaigns-${this.stage}`,
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
		newPromoCampaignTable.grantWriteData(promoCampaignSyncLambda);

		new SrLambdaAlarm(this, 'PromoCampaignSyncLambdaErrorAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - promo-campaign-sync lambda error`,
			alarmDescription:
				'The promo-campaign-sync lambda failed to process an event.',
			lambdaFunctionNames: promoCampaignSyncLambda.functionName,
			metric: new Metric({
				metricName: 'Errors',
				namespace: 'AWS/Lambda',
				statistic: 'Sum',
				period: Duration.minutes(5),
				dimensionsMap: {
					FunctionName: promoCampaignSyncLambda.functionName,
				},
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
	}
}
