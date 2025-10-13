import type { Identity } from '@guardian/cdk/lib/constructs/core';
import type { GuFunctionProps } from '@guardian/cdk/lib/constructs/lambda';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { Duration } from 'aws-cdk-lib';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { nodeVersion } from '../node-version';
import type { SrStack } from './sr-stack';

export type SrLambdaProps = {
	/**
	 * when you have multiple lambdas in an app, give each a different nameSuffix
	 * Then SrCDK will use them to name the lambda and associated resources
	 */
	nameSuffix?: string;
	/**
	 * if you want to set any non-SR-standard values on GuLambdaFunction
	 */
	lambdaOverrides: GuLambdaOverrides;
};

type DefaultProps = ReturnType<typeof getLambdaDefaultProps>;
type GuLambdaOverrides = Omit<GuFunctionProps, keyof DefaultProps> &
	Partial<DefaultProps>;

function getLambdaDefaultProps(
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

/**
 * This is a lambda function construct with sensible defaults for this repo.
 */
export class SrLambda extends GuLambdaFunction {
	constructor(scope: SrStack, id: string, props: SrLambdaProps) {
		const defaultGuLambdaFunctionProps = getLambdaDefaultProps(
			scope,
			props.nameSuffix,
		);
		const guLambdaFunctionProps = {
			...defaultGuLambdaFunctionProps,
			...props.lambdaOverrides,
			environment: {
				...defaultGuLambdaFunctionProps.environment,
				...props.lambdaOverrides.environment,
			},
		};

		super(scope, id, guLambdaFunctionProps);
	}
}

/**
 * produces a readable, predictable and unique name of the form my-api-PROD
 * used for when things need to be unique within the stack
 *
 * @param identity pass in the srStack here
 * @param nameSuffix if multiple lambdas are in the app, adds my-api-nameSuffix-PROD
 */
export function getNameWithStage(
	identity: Identity,
	nameSuffix: string | undefined,
) {
	return `${identity.app}${nameSuffix ? '-' + nameSuffix : ''}-${identity.stage}`;
}
