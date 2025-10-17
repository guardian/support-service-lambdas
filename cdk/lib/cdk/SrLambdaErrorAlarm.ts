import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import type { SrLambdaAlarmProps } from './SrLambdaAlarm';
import { SrLambdaAlarm } from './SrLambdaAlarm';
import type { SrStack } from './SrStack';

export type SrLambdaErrorAlarmProps = {
	/**
	 * lambda to monitor
	 */
	lambdaFunctionName: string;
	/**
	 * The impact on the user or our processes of a failure, this is important for triaging alarms and appears on the alarm message.
	 */
	errorImpact: string;
} & Omit<
	Partial<SrLambdaAlarmProps>,
	'lambdaFunctionNames' | 'alarmDescription'
>;

/**
 * this alarms on any error of the lambda
 */
export class SrLambdaErrorAlarm extends SrLambdaAlarm {
	constructor(scope: SrStack, id: string, props: SrLambdaErrorAlarmProps) {
		super(scope, id, {
			app: scope.app,
			alarmName: `${props.lambdaFunctionName} Lambda has failed`,
			alarmDescription:
				props.lambdaFunctionName +
				' failed. Search the logs below for "error" for more information. Impact: ' +
				props.errorImpact,
			evaluationPeriods: 1,
			threshold: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new Metric({
				metricName: 'Errors',
				namespace: 'AWS/Lambda',
				statistic: 'Sum',
				period: Duration.seconds(60),
				dimensionsMap: {
					FunctionName: props.lambdaFunctionName,
				},
			}),
			treatMissingData: TreatMissingData.NOT_BREACHING,
			lambdaFunctionNames: props.lambdaFunctionName,
			...props,
		});
	}
}
