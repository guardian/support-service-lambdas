import type { GuAlarmProps } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import { Tags } from 'aws-cdk-lib';

export interface SrLambdaAlarmProps
	extends Omit<GuAlarmProps, 'snsTopicName' | 'actionsEnabled'> {
	lambdaFunctionNames: string | string[];
	actionsEnabled?: boolean; // defaults to PROD only
}

export class SrLambdaAlarm extends GuAlarm {
	constructor(scope: GuStack, id: string, props: SrLambdaAlarmProps) {
		super(scope, id, {
			...props,
			snsTopicName: `alarms-handler-topic-${scope.stage}`,
			actionsEnabled: props.actionsEnabled ?? scope.stage == 'PROD',
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
