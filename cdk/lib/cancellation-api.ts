import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator, MathExpression } from 'aws-cdk-lib/aws-cloudwatch';
import {
	Choice,
	Condition,
	DefinitionBody,
	Errors,
	QueryLanguage,
	StateMachine,
	StateMachineType,
	Succeed,
	Wait,
	WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import { getNameWithStage, SrLambda } from './cdk/SrLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class CancellationApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'cancellation-api' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'Subscription cancellation preview and execute API',
				handler: 'cancel/index.handler',
			},
			monitoring: {
				errorImpact:
					'one or more users were not able to cancel their subscription online',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});
		lambda.addPublicPath('explorer');
		lambda.addPublicPath('openapi.json');

		const refundWorkflow = this.createRefundWorkflow();
		refundWorkflow.grantStartExecution(lambda);
		lambda.addEnvironment(
			'REFUND_STATE_MACHINE_ARN',
			refundWorkflow.stateMachineArn,
		);
	}

	private createRefundWorkflow(): StateMachine {
		const zuoraPolicy = new AllowZuoraOAuthSecretsPolicy(
			this,
			'Refund workflow Zuora OAuth Secrets Manager policy',
		);

		const refundLambda = (
			id: string,
			nameSuffix: string,
			handlerName: string,
			description: string,
		) => {
			const refundLambda = new SrLambda(this, id, {
				nameSuffix: `refund-${nameSuffix}`,
				lambdaOverrides: {
					description: `Refund workflow step: ${description}`,
					handler: `refund/handlers/${handlerName}.handler`,
					// Zuora order calls (e.g. re-cancelling when backdating) can take ~60s
					timeout: Duration.minutes(5),
				},
			});
			refundLambda.addPolicies(zuoraPolicy);
			return refundLambda;
		};

		const generateCancellationInvoiceLambda = refundLambda(
			'GenerateCancellationInvoiceLambda',
			'generate-cancellation-invoice',
			'generateCancellationInvoice',
			'generates and posts the negative invoice for a cancellation',
		);
		const calculateRefundLambda = refundLambda(
			'CalculateRefundLambda',
			'calculate-refund',
			'calculateRefund',
			'calculates the refund (or credit) for a cancelled subscription',
		);
		const checkPaymentSettlementLambda = refundLambda(
			'CheckPaymentSettlementLambda',
			'check-payment-settlement',
			'checkPaymentSettlement',
			'checks whether the payment for an invoice has settled',
		);
		const createRefundLambda = refundLambda(
			'CreateRefundLambda',
			'create-refund',
			'createRefund',
			'refunds the payment',
		);
		const balanceInvoicesLambda = refundLambda(
			'BalanceInvoicesLambda',
			'balance-invoices',
			'balanceInvoices',
			'brings the paid and negative invoice balances to zero',
		);
		const getCancellationReasonLambda = refundLambda(
			'GetCancellationReasonLambda',
			'get-cancellation-reason',
			'getCancellationReason',
			'reads the cancellation reasons before backdating',
		);
		const backdateCancellationLambda = refundLambda(
			'BackdateCancellationLambda',
			'backdate-cancellation',
			'backdateCancellation',
			'backdates the cancellation to the start of the unpaid period',
		);
		const sendPaymentFailedEmailLambda = refundLambda(
			'SendPaymentFailedEmailLambda',
			'send-payment-failed-email',
			'sendPaymentFailedEmail',
			'tells the customer their subscription was cancelled after a failed payment',
		);
		sendPaymentFailedEmailLambda.addPolicies(
			AllowSqsSendPolicy.create(this, 'braze-emails'),
		);

		// Each step gets the workflow state, and its result is merged into the state
		const step = (id: string, lambdaFunction: SrLambda) =>
			LambdaInvoke.jsonata(this, id, {
				lambdaFunction,
				payloadResponseOnly: true,
				outputs: '{% $merge([$states.input, $states.result]) %}',
			})
				.addRetry({ errors: ['PermanentError'], maxAttempts: 0 })
				// about a day, to ride out a Zuora or AWS outage: every step is safe to re-run
				.addRetry({
					errors: [Errors.ALL],
					interval: Duration.minutes(1),
					maxDelay: Duration.hours(1),
					maxAttempts: 30,
					backoffRate: 2,
				});
		const when = (condition: string) => Condition.jsonata(`{% ${condition} %}`);

		const succeed = Succeed.jsonata(this, 'Succeed');

		const balanceInvoices = step('BalanceInvoices', balanceInvoicesLambda).next(
			Choice.jsonata(this, 'Backdated?')
				.when(
					when('$states.input.backdated = true'),
					step('SendPaymentFailedEmail', sendPaymentFailedEmailLambda).next(
						succeed,
					),
					{ comment: 'Yes' },
				)
				.otherwise(succeed),
		);

		const checkPaymentSettlement = step(
			'CheckPaymentSettlement',
			checkPaymentSettlementLambda,
		);
		checkPaymentSettlement.next(
			Choice.jsonata(this, 'Payment?')
				.when(
					when('$states.input.status = "Pending"'),
					Wait.jsonata(this, 'Wait 24h', {
						time: WaitTime.duration(Duration.hours(24)),
					}).next(checkPaymentSettlement),
					{ comment: 'Pending' },
				)
				.when(
					when('$states.input.status = "Failed"'),
					step('GetCancellationReason', getCancellationReasonLambda)
						.next(step('BackdateCancellation', backdateCancellationLambda))
						.next(step('CalculateCredit', calculateRefundLambda))
						.next(balanceInvoices),
					{ comment: 'Failed' },
				)
				.when(
					when(
						'$states.input.status = "Settled" and $states.input.refundDue = true',
					),
					step('CreateRefund', createRefundLambda).next(balanceInvoices),
					{ comment: 'Settled, refund due' },
				)
				.otherwise(succeed),
		);

		const refundDue = step(
			'GenerateCancellationInvoice',
			generateCancellationInvoiceLambda,
		)
			.next(step('CalculateRefund', calculateRefundLambda))
			.next(
				Choice.jsonata(this, 'Zero amount?')
					.when(when('$states.input.refundAmount = 0'), balanceInvoices, {
						comment: 'Yes',
					})
					.otherwise(checkPaymentSettlement),
			);

		const stateMachine = new StateMachine(this, 'RefundStateMachine', {
			stateMachineName: getNameWithStage(this, 'refund'),
			stateMachineType: StateMachineType.STANDARD,
			queryLanguage: QueryLanguage.JSONATA,
			// Ends an execution still waiting for payment settlement. Bacs settles within 6 working days, so this covers bank
			// holidays
			timeout: Duration.days(14),
			definitionBody: DefinitionBody.fromChainable(
				Choice.jsonata(this, 'Refund due?')
					.when(when('$states.input.refundDue = true'), refundDue, {
						comment: 'Yes',
					})
					.otherwise(checkPaymentSettlement),
			),
		});

		const metricProps = { period: Duration.minutes(5), statistic: 'Sum' };
		new SrLambdaAlarm(this, 'RefundStateMachineFailureAlarm', {
			app: this.app,
			metric: new MathExpression({
				expression: 'failed + timedOut + aborted',
				usingMetrics: {
					failed: stateMachine.metricFailed(metricProps),
					timedOut: stateMachine.metricTimedOut(metricProps),
					aborted: stateMachine.metricAborted(metricProps),
				},
				period: metricProps.period,
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			alarmName: `${this.stage}: cancellation-api refund workflow execution failed`,
			alarmDescription:
				'A cancellation refund workflow execution failed, so a refund, invoice balancing or failed payment backdating may be incomplete. Find the failed execution in the Step Functions console: its error says which step failed and why, or it timed out still waiting for the payment to settle. Once the cause is fixed, redrive the execution to resume from the failed step.',
			// log links for all eight Lambdas would exceed the 256 character tag limit, and the failed execution links to the failing step's logs
			lambdaFunctionNames: [],
		});

		return stateMachine;
	}
}
