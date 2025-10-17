import type { GuScheduledLambdaProps } from '@guardian/cdk';
import type { NoMonitoring } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuLambdaErrorPercentageAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type {
	AppIdentity,
	StackStageIdentity,
} from '@guardian/cdk/lib/constructs/core';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import type { Construct } from 'constructs';
import type { SrLambdaProps } from './SrLambda';
import { SrLambda } from './SrLambda';
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

export type SrConstruct = Construct & AppIdentity & StackStageIdentity;

/**
 * This creates a lambda running on a schedule, according to SR standards.
 */
export class SrScheduledLambda extends SrLambda implements Construct {
	constructor(scope: SrStack, id: string, props: SrScheduledLambdaProps) {
		const finalProps = {
			nameSuffix: props.nameSuffix,
			lambdaOverrides: props.lambdaOverrides,
			legacyId: props.legacyId,
		};

		super(scope, id, finalProps);

		props.rules.forEach((rule, index) => {
			new Rule(this, `Rule${index}`, {
				schedule: rule.schedule,
				targets: [new LambdaFunction(this, { event: rule.input })],
				...(rule.description && { description: rule.description }),
				enabled: true,
			});
		});

		if (!props.monitoring?.noMonitoring) {
			new GuLambdaErrorPercentageAlarm(
				scope,
				`${this.node.id}ErrorPercentageAlarm`, // have to add the id as scope is stack
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
