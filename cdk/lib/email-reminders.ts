import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
	FilterPattern,
	LogGroup,
	MetricFilter,
	RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { AllowZuoraOAuthSecretsPolicy } from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const errorImpact =
	'a subscriber may not have been sent a legally required reminder or notice email';

export class EmailReminders extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'email-reminders' });

		// created explicitly so the charge-not-billing metric filter can be attached to it
		const processorLogGroup = new LogGroup(this, 'ProcessorLogGroup', {
			logGroupName: `/aws/lambda/email-reminders-processor-${this.stage}`,
			retention: RetentionDays.ONE_MONTH,
		});

		const processor = new SrSqsLambda(this, 'ProcessorLambda', {
			nameSuffix: 'processor',
			lambdaOverrides: {
				description:
					'Decides which reminder or notice email, if any, a subscriber is due',
				timeout: Duration.seconds(30),
				logGroup: processorLogGroup,
			},
			monitoring: { errorImpact },
			maxReceiveCount: 3,
			visibilityTimeout: Duration.seconds(60),
			maxConcurrency: 5, // limit concurrent Zuora API calls
		});
		processor.addPolicies(new AllowZuoraOAuthSecretsPolicy(this));

		const api = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'Receives Zuora callouts used to send reminder and notice emails to subscribers',
			},
			monitoring: { errorImpact },
			// Zuora sends each scheduled event's callouts in a burst; rejected callouts are retried by Zuora
			throttle: {
				rateLimit: 500,
				burstLimit: 1000,
			},
		});
		processor.inputQueue.grantSendMessages(api);

		const chargeNotBillingFilter = new MetricFilter(
			this,
			'ChargeNotBillingMetricFilter',
			{
				logGroup: processorLogGroup,
				filterPattern: FilterPattern.literal(
					'"EMAIL_REMINDER_CHARGE_NOT_BILLING"',
				),
				metricNamespace: `support-service-lambdas-${this.stage}`,
				metricName: 'email-reminders-charge-not-billing',
				metricValue: '1',
			},
		);

		new SrLambdaAlarm(this, 'ChargeNotBillingAlarm', {
			app: this.app,
			lambdaFunctionNames: processor.functionName,
			alarmName: `${this.app}-${this.stage} billing date callout for a charge that no longer bills on that date`,
			alarmDescription: `A subscription changed between Zuora sending a billing date callout and it being processed, so it may not have been evaluated. Search the processor logs for EMAIL_REMINDER_CHARGE_NOT_BILLING. Impact: ${errorImpact}`,
			metric: chargeNotBillingFilter.metric({
				statistic: 'Sum',
				period: Duration.hours(1),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
	}
}
