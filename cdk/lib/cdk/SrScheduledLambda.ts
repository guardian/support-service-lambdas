import type { GuScheduledLambdaProps } from '@guardian/cdk';
import type { NoMonitoring } from '@guardian/cdk/lib/constructs/cloudwatch';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import type { Construct } from 'constructs';
import type { SrLambdaProps } from './SrLambda';
import { SrLambda } from './SrLambda';
import type { SrLambdaErrorAlarmProps } from './SrLambdaErrorAlarm';
import { SrLambdaErrorAlarm } from './SrLambdaErrorAlarm';
import type { SrStack } from './SrStack';

type SrScheduledLambdaProps = SrLambdaProps & {
	/**
	 * rules as per the GuCDK definition, plus an optional `name` per rule
	 */
	rules: Array<
		GuScheduledLambdaProps['rules'][number] & {
			/**
			 * override the physical name (CloudFormation `Name`) of the schedule Rule,
			 * e.g. to preserve an existing name during a migration so it is updated in
			 * place rather than replaced. If omitted, CloudFormation auto-generates it
			 */
			name?: string;
		}
	>;
	/**
	 * do we want to disable standard SrCDK alarm or override any properties?
	 */
	monitoring:
		| NoMonitoring
		| (Partial<SrLambdaErrorAlarmProps> & {
				noMonitoring?: false;
				errorImpact: string;
		  });
};

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
				...(rule.name && { ruleName: rule.name }),
				enabled: true,
			});
		});

		if (scope.stage === 'PROD' && !props.monitoring.noMonitoring) {
			new SrLambdaErrorAlarm(
				scope,
				`${this.node.id}ErrorPercentageAlarm`, // have to add the id as scope is stack
				{
					lambdaFunctionName: this.functionName,
					...props.monitoring,
				},
			);
		}
	}
}
