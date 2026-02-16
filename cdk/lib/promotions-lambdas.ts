import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import {
	DynamoEventSource,
	SqsDlq,
} from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SrLambda } from './cdk/SrLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import { SrScheduledLambda } from './cdk/SrScheduledLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const app = 'promotions-lambdas';

interface Props {
	oldPromoCampaignStreamLabel: string;
	oldPromoStreamLabel: string;
	newPromoStreamLabel: string;
}

export class PromotionsLambdas extends SrStack {
	constructor(scope: App, stage: SrStageNames, props: Props) {
		super(scope, { stage, app });

		const promoCampaignSyncLambda = new SrLambda(this, 'PromoCampaignSync', {
			nameSuffix: 'promo-campaign-sync',
			lambdaOverrides: {
				handler: 'handlers/promoCampaignSync.handler',
			},
		});

		const promoSyncLambda = new SrLambda(this, 'PromoSync', {
			nameSuffix: 'promo-sync',
			lambdaOverrides: {
				handler: 'handlers/promoSync.handler',
			},
		});

		const promoCodeViewLambda = new SrLambda(this, 'PromoCodeView', {
			nameSuffix: 'promo-code-view',
			lambdaOverrides: {
				handler: 'handlers/promoCodeView.handler',
			},
		});

		const salesforceExportLambda = new SrScheduledLambda(
			this,
			'SalesforceExport',
			{
				nameSuffix: 'salesforce-export',
				lambdaOverrides: {
					handler: 'handlers/salesforceExport.handler',
					timeout: Duration.minutes(2),
					initialPolicy: [
						new PolicyStatement({
							actions: ['secretsmanager:GetSecretValue'],
							resources: [
								`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Salesforce/ConnectedApp/PromoSalesforceExport-*`,
							],
						}),
					],
				},
				rules: [
					{
						schedule: Schedule.cron({
							weekDay: 'MON-SUN',
							hour: '8',
							minute: '0',
						}),
						description: 'promo codes salesforce export trigger',
					},
				],
				monitoring: {
					snsTopicName: `alarms-handler-topic-${this.stage}`,
					errorImpact: 'New promo codes are not exported to Salesforce',
				},
			},
		);

		const oldPromoCampaignTable = dynamodb.Table.fromTableAttributes(
			this,
			'OldPromoCampaignTable',
			{
				tableName: `MembershipSub-Campaigns-${stage}`,
				tableStreamArn: `arn:aws:dynamodb:${this.region}:${this.account}:table/MembershipSub-Campaigns-${stage}/stream/${props.oldPromoCampaignStreamLabel}`,
			},
		);

		const oldPromoTable = dynamodb.Table.fromTableAttributes(
			this,
			'OldPromoTable',
			{
				tableName: `MembershipSub-Promotions-${stage}`,
				tableStreamArn: `arn:aws:dynamodb:${this.region}:${this.account}:table/MembershipSub-Promotions-${stage}/stream/${props.oldPromoStreamLabel}`,
			},
		);

		const newPromoCampaignTable = dynamodb.Table.fromTableName(
			this,
			'NewPromoCampaignTable',
			`support-admin-console-promo-campaigns-${this.stage}`,
		);

		const newPromoTable = dynamodb.Table.fromTableAttributes(
			this,
			'NewPromoTable',
			{
				tableName: `support-admin-console-promos-${this.stage}`,
				tableStreamArn: `arn:aws:dynamodb:${this.region}:${this.account}:table/support-admin-console-promos-${this.stage}/stream/${props.newPromoStreamLabel}`,
			},
		);

		const promoCodeViewTable = dynamodb.Table.fromTableName(
			this,
			'PromoCodeViewTable',
			`MembershipSub-PromoCode-View-${this.stage}`,
		);

		// dead letter queues for handling failed events
		const promoCampaignSyncDlq = new Queue(this, 'PromoCampaignSyncDlq', {
			queueName: `${app}-promo-campaign-sync-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const promoSyncDlq = new Queue(this, 'PromoSyncDlq', {
			queueName: `${app}-promo-sync-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const promoCodeViewDlq = new Queue(this, 'PromoCodeViewDlq', {
			queueName: `${app}-promo-code-view-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		promoCampaignSyncLambda.addEventSource(
			new DynamoEventSource(oldPromoCampaignTable, {
				startingPosition: StartingPosition.TRIM_HORIZON,
				batchSize: 5,
				maxBatchingWindow: Duration.seconds(10),
				bisectBatchOnError: true,
				retryAttempts: 3,
				reportBatchItemFailures: true,
				parallelizationFactor: 1,
				onFailure: new SqsDlq(promoCampaignSyncDlq),
			}),
		);

		promoSyncLambda.addEventSource(
			new DynamoEventSource(oldPromoTable, {
				startingPosition: StartingPosition.TRIM_HORIZON,
				batchSize: 5,
				maxBatchingWindow: Duration.seconds(10),
				bisectBatchOnError: true,
				retryAttempts: 3,
				reportBatchItemFailures: true,
				parallelizationFactor: 1,
				onFailure: new SqsDlq(promoSyncDlq),
			}),
		);

		promoCodeViewLambda.addEventSource(
			new DynamoEventSource(newPromoTable, {
				startingPosition: StartingPosition.TRIM_HORIZON,
				batchSize: 5,
				maxBatchingWindow: Duration.seconds(10),
				bisectBatchOnError: true,
				retryAttempts: 3,
				reportBatchItemFailures: true,
				parallelizationFactor: 1,
				onFailure: new SqsDlq(promoCodeViewDlq),
			}),
		);

		oldPromoCampaignTable.grantStreamRead(promoCampaignSyncLambda);
		newPromoCampaignTable.grantWriteData(promoCampaignSyncLambda);

		oldPromoTable.grantStreamRead(promoSyncLambda);
		newPromoTable.grantWriteData(promoSyncLambda);

		newPromoTable.grantStreamRead(promoCodeViewLambda);
		newPromoCampaignTable.grantReadData(promoCodeViewLambda);
		promoCodeViewTable.grantWriteData(promoCodeViewLambda);

		promoCodeViewTable.grantReadData(salesforceExportLambda);

		// Alarms for lambda failures
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

		new SrLambdaAlarm(this, 'PromoSyncLambdaErrorAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - promo-sync lambda error`,
			alarmDescription: 'The promo-sync lambda failed to process an event.',
			lambdaFunctionNames: promoSyncLambda.functionName,
			metric: new Metric({
				metricName: 'Errors',
				namespace: 'AWS/Lambda',
				statistic: 'Sum',
				period: Duration.minutes(5),
				dimensionsMap: {
					FunctionName: promoSyncLambda.functionName,
				},
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		new SrLambdaAlarm(this, 'PromoCodeViewLambdaErrorAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - promo-code-view lambda error`,
			alarmDescription:
				'The promo-code-view lambda failed to process an event.',
			lambdaFunctionNames: promoCodeViewLambda.functionName,
			metric: new Metric({
				metricName: 'Errors',
				namespace: 'AWS/Lambda',
				statistic: 'Sum',
				period: Duration.minutes(5),
				dimensionsMap: {
					FunctionName: promoCodeViewLambda.functionName,
				},
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		// alarms for failed events on the DLQs
		new SrLambdaAlarm(this, 'PromoCampaignSyncDlqAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - promo-campaign-sync dlq messages`,
			alarmDescription:
				'The promo-campaign-sync lambda has failed records in the DLQ.',
			lambdaFunctionNames: promoCampaignSyncLambda.functionName,
			metric: promoCampaignSyncDlq.metricApproximateNumberOfMessagesVisible({
				period: Duration.minutes(5),
				statistic: 'Maximum',
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		new SrLambdaAlarm(this, 'PromoSyncDlqAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - promo-sync dlq messages`,
			alarmDescription: 'The promo-sync lambda has failed records in the DLQ.',
			lambdaFunctionNames: promoSyncLambda.functionName,
			metric: promoSyncDlq.metricApproximateNumberOfMessagesVisible({
				period: Duration.minutes(5),
				statistic: 'Maximum',
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		new SrLambdaAlarm(this, 'PromoCodeViewDlqAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - promo-code-view dlq messages`,
			alarmDescription:
				'The promo-code-view lambda has failed records in the DLQ.',
			lambdaFunctionNames: promoCodeViewLambda.functionName,
			metric: promoCodeViewDlq.metricApproximateNumberOfMessagesVisible({
				period: Duration.minutes(5),
				statistic: 'Maximum',
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
	}
}
