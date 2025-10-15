import type { Identity } from '@guardian/cdk/lib/constructs/core';
import type { GuPolicy } from '@guardian/cdk/lib/constructs/iam/policies/base-policy';
import type { GuFunctionProps } from '@guardian/cdk/lib/constructs/lambda';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { Duration } from 'aws-cdk-lib';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { nodeVersion } from '../node-version';
import type { SrStack } from './SrStack';

export type SrLambdaProps = {
	/**
	 * when you have multiple lambdas in an app, give each a different nameSuffix
	 * Then SrCDK will use them to name the lambda and associated resources
	 */
	nameSuffix?: string;
	/**
	 * if you want to set any non-SR-standard values on GuLambdaFunction
	 */
	lambdaOverrides?: GuLambdaOverrides;
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
	constructor(scope: SrStack, props: SrLambdaProps) {
		const defaultGuLambdaFunctionProps = getLambdaDefaultProps(
			scope,
			props.nameSuffix,
		);
		const guLambdaFunctionProps = {
			...defaultGuLambdaFunctionProps,
			...props.lambdaOverrides,
			environment: {
				...defaultGuLambdaFunctionProps.environment,
				...props.lambdaOverrides?.environment,
			},
		};

		super(
			scope,
			[scope.app, props.nameSuffix, 'lambda']
				.filter((a) => a !== undefined)
				.join('-'),
			guLambdaFunctionProps,
		);
	}

	addPolicies(...policies: GuPolicy[]) {
		policies.forEach((p) => this.role!.attachInlinePolicy(p));
	}
}

/**
 * produces a readable, predictable and unique name of the form my-api-PROD
 * used for when things need to be unique within the stack
 *
 * @param identity pass in the srStack here
 * @param nameSuffix if multiple lambdas are in the app, adds my-api-nameSuffix-PROD
 * @param resourceName e.g. "queue" or "lambda"
 */
export function getNameWithStage(
	identity: Identity,
	nameSuffix?: string | undefined,
	resourceName?: string,
) {
	return [identity.app, nameSuffix, resourceName, identity.stage]
		.filter((s) => s !== undefined)
		.join('-');
}

/**
 * produces a readable, predictable and stack-unique id of the form nameSuffix-item
 * used for when things need to be unique within the stack
 *
 * @param nameSuffix if multiple lambdas are in the app, adds my-api-nameSuffix-PROD
 * @param resourceName e.g. "queue" or "lambda"
 * @param items any extended information to include
 */
export function getId(
	nameSuffix: string | undefined,
	resourceName: string,
	...items: string[]
) {
	return `${nameSuffix ? nameSuffix + '-' : ''}${resourceName}-${items.join('-')}`;
}
