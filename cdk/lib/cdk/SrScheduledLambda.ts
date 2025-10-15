import type { GuScheduledLambdaProps } from '@guardian/cdk';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import type { SrLambdaProps } from './SrLambda';
import { SrLambda } from './SrLambda';
import type { SrStack } from './SrStack';

type SrScheduledLambdaProps = SrLambdaProps & {
	/**
	 * rules as per the GuCDK definition
	 */
	rules: GuScheduledLambdaProps['rules'];
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
				[
					scope.app,
					props.nameSuffix,
					'lambda',
					rule.schedule.expressionString,
					index,
				]
					.filter((a) => a !== undefined)
					.join('-'),
				{
					schedule: rule.schedule,
					targets: [new LambdaFunction(this, { event: rule.input })],
					...(rule.description && { description: rule.description }),
					enabled: true,
				},
			);
		});
	}
}
