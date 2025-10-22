import { Duration } from 'aws-cdk-lib';
import type { RestApi } from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import type { SrLambdaAlarmProps } from './SrLambdaAlarm';
import { SrLambdaAlarm } from './SrLambdaAlarm';
import type { SrStack } from './SrStack';

export type SrApiGateway5xxAlarmProps = {
	/**
	 * function(s) that backs the lambda (if any), this is used to identify the logs relevant to any alarm state
	 */
	lambdaFunctionNames: string[];
	restApi: RestApi;
	/**
	 * The impact on the user or our processes of a failure, this is important for triaging alarms and appears on the alarm message.
	 */
	errorImpact: string;
	/**
	 * if you need to override any other properties of the alarm, use this
	 */
	overrides?: Partial<SrLambdaAlarmProps>;
};

function getDefaultProps(
	scope: SrStack,
	props: SrApiGateway5xxAlarmProps,
): SrLambdaAlarmProps {
	return {
		app: scope.app,
		alarmName: props.restApi.restApiName + ' 5XX errors',
		alarmDescription:
			scope.app +
			' returned a 5XX response. Search the logs below for "error" for more information. Impact: ' +
			props.errorImpact,
		evaluationPeriods: 1,
		threshold: 1,
		lambdaFunctionNames: props.lambdaFunctionNames,
		comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
		treatMissingData: TreatMissingData.NOT_BREACHING,
		metric: props.restApi.metricServerError({
			statistic: 'Sum',
			period: Duration.seconds(60),
		}),
	};
}

/**
 * This alarm triggers on a single 5xx error on an API gateway lambda
 */
export class SrApiGateway5xxAlarm extends SrLambdaAlarm {
	constructor(scope: SrStack, props: SrApiGateway5xxAlarmProps) {
		super(scope, 'ApiGateway5XXAlarmCDK', {
			...getDefaultProps(scope, props),
			...props.overrides,
		});
	}
}
