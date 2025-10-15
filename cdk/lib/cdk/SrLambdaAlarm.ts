import type { GuAlarmProps } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import { Tags } from 'aws-cdk-lib';

export interface SrLambdaAlarmProps
	extends Omit<GuAlarmProps, 'snsTopicName' | 'actionsEnabled'> {
	/**
	 * lambda(s) that cause this alarm, this is used to generate a log link on the alarm
	 */
	lambdaFunctionNames: string | string[];
	/**
	 * if you wish to override the default actionsEnabled
	 */
	actionsEnabled?: boolean; // defaults to PROD only
	/**
	 * use if you don't want the alarms to go to alarms-handler
	 */
	snsTopicName?: string;
}

export class SrLambdaAlarm extends GuAlarm {
	constructor(scope: GuStack, id: string, props: SrLambdaAlarmProps) {
		super(scope, id, {
			snsTopicName: `alarms-handler-topic-${scope.stage}`,
			actionsEnabled: scope.stage == 'PROD',
			...props,
		});
		const lambdaFunctionNames =
			typeof props.lambdaFunctionNames === 'string'
				? [props.lambdaFunctionNames]
				: props.lambdaFunctionNames;
		const diagnosticLinksValue = lambdaFunctionNames
			.map((lambdaFunctionName) => `lambda:${lambdaFunctionName}`)
			.join(' ');
		Tags.of(this).add('DiagnosticLinks', diagnosticLinksValue);
	}
}
