import type { Identity } from '@guardian/cdk/lib/constructs/core';
import type { GuFunctionProps } from '@guardian/cdk/lib/constructs/lambda';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { Duration } from 'aws-cdk-lib';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { nodeVersion } from '../node-version';
import type { SrStack } from './sr-stack';

export type SrLambdaProps = {
	nameSuffix?: string; // when you have multiple lambdas in an app
};

type DefaultProps = ReturnType<typeof getLambdaDefaultProps>;
type GuLambdaOverrides = Omit<GuFunctionProps, keyof DefaultProps> &
	Partial<DefaultProps>;

export function getNameWithStage(
	identity: Identity,
	nameSuffix: string | undefined,
) {
	return `${identity.app}${nameSuffix ? '-' + nameSuffix : ''}-${identity.stage}`;
}

export function getLambdaDefaultProps(
	scope: Identity,
	nameSuffix: string | undefined,
) {
	return {
		app: scope.app,
		functionName: getNameWithStage(scope, nameSuffix),
		fileName: `${scope.app}.zip`,
		handler: 'index.handler',
		runtime: nodeVersion,
		loggingFormat: LoggingFormat.TEXT,
		memorySize: 1024,
		timeout: Duration.seconds(15),
		environment: {
			NODE_OPTIONS: '--enable-source-maps',
		} as Record<string, string>,
	};
}

export class SrLambda extends GuLambdaFunction {
	constructor(
		scope: SrStack,
		id: string,
		lambdaOverrides: GuLambdaOverrides,
		props: SrLambdaProps,
	) {
		const defaultProps = getLambdaDefaultProps(scope, props.nameSuffix);
		const finalProps = {
			...defaultProps,
			...lambdaOverrides,
			environment: {
				...defaultProps.environment,
				...lambdaOverrides.environment,
			},
		};

		super(scope, id, finalProps);
	}
}
