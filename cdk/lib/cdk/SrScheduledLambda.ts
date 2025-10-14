import type { GuScheduledLambdaProps } from '@guardian/cdk';
import { Duration } from 'aws-cdk-lib';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { getNameWithStage, SrLambda } from './SrLambda';
import type { SrLambdaProps } from './SrLambda';
import type { SrStack } from './SrStack';

type SrScheduledLambdaProps = SrLambdaProps & {
	/**
	 * rules as per the GuCDK definition
	 */
	rules: GuScheduledLambdaProps['rules'];
};

const defaultProps = {
	timeout: Duration.seconds(300),
};

/**
 * This creates a lambda running on a schedule, according to SR standards.
 */
export class SrScheduledLambda extends SrLambda {
	constructor(scope: SrStack, props: SrScheduledLambdaProps) {
		const finalProps = {
			nameSuffix: props.nameSuffix,
			lambdaOverrides: {
				...defaultProps,
				...props.lambdaOverrides,
			},
		};

		super(scope, finalProps);

		props.rules.forEach((rule, index) => {
			new Rule(
				this,
				`${getNameWithStage(scope, props.nameSuffix)}-${rule.schedule.expressionString}-${index}`,
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
