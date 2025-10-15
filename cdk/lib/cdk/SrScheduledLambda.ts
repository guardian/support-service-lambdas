import type { GuScheduledLambdaProps } from '@guardian/cdk';
import type { NoMonitoring } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuLambdaErrorPercentageAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import type { SrLambdaProps } from './SrLambda';
import { getId, SrLambda } from './SrLambda';
import type { SrLambdaAlarmProps } from './SrLambdaAlarm';
import type { SrStack } from './SrStack';

type SrScheduledLambdaProps = SrLambdaProps & {
	/**
	 * rules as per the GuCDK definition
	 */
	rules: GuScheduledLambdaProps['rules'];
	/**
	 * do we want to disable standard SrCDK alarm or override any properties?
	 */
	monitoring?:
		| NoMonitoring
		| (Partial<SrLambdaAlarmProps> & { noMonitoring?: false });
};

/**
 * This creates a lambda running on a schedule, according to SR standards.
 */
export class SrScheduledLambda extends SrLambda {
	constructor(scope: SrStack, props: SrScheduledLambdaProps) {
		const finalProps = {
			nameSuffix: props.nameSuffix,
			lambdaOverrides: props.lambdaOverrides,
		};

		super(scope, finalProps);

		props.rules.forEach((rule, index) => {
			new Rule(
				this,
				getId(
					props.nameSuffix,
					'lambda',
					rule.schedule.expressionString,
					`${index}`,
				),
				{
					schedule: rule.schedule,
					targets: [new LambdaFunction(this, { event: rule.input })],
					...(rule.description && { description: rule.description }),
					enabled: true,
				},
			);
		});

		if (!props.monitoring?.noMonitoring) {
			new GuLambdaErrorPercentageAlarm(
				scope,
				getId(props.nameSuffix, `ErrorPercentageAlarmForLambda`),
				{
					snsTopicName: `alarms-handler-topic-${scope.stage}`,
					actionsEnabled: scope.stage == 'PROD',
					toleratedErrorPercentage: 0,
					numberOfEvaluationPeriodsAboveThresholdBeforeAlarm: 1,
					lambda: this,
					...props.monitoring,
				},
			);
		}
	}
}
