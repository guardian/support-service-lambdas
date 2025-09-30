import type { GuApiLambdaProps } from '@guardian/cdk';
import { GuApiLambda } from '@guardian/cdk';
import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { GuFunctionProps } from '@guardian/cdk/lib/constructs/lambda';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { Duration } from 'aws-cdk-lib';
import { LoggingFormat, type Runtime } from 'aws-cdk-lib/aws-lambda';
import { nodeVersion } from '../node-version';

type SrDefaultProps = {
	fileName: string;
	handler: string;
	runtime: Runtime;
	loggingFormat: LoggingFormat;
	memorySize: number;
	timeout: Duration;
	environment: Record<string, string>;
};

type SrLambdaProps = Omit<GuFunctionProps, keyof SrDefaultProps> &
	Partial<SrDefaultProps>;

const defaultProps: (
	app: string,
	extraVars: Record<string, string>,
) => SrDefaultProps = (
	app: string,
	extraVars: Record<string, string> = {},
) => ({
	fileName: `${app}.zip`,
	handler: 'index.handler',
	runtime: nodeVersion,
	loggingFormat: LoggingFormat.TEXT,
	memorySize: 1024,
	timeout: Duration.seconds(15),
	environment: {
		NODE_OPTIONS: '--enable-source-maps',
		...extraVars,
	},
});

export class SrLambda extends GuLambdaFunction {
	constructor(scope: GuStack, id: string, props: SrLambdaProps) {
		const finalProps = {
			...defaultProps(props.app, {}),
			...props,
		};

		super(scope, id, finalProps);
	}
}

type SrApiLambdaProps = Omit<GuApiLambdaProps, keyof SrDefaultProps> &
	Partial<SrDefaultProps>;

export class SrApiLambda extends GuApiLambda {
	constructor(scope: GuStack, id: string, props: SrApiLambdaProps) {
		const deprecatedVars = {
			// for some reason we often use these instead of the upper case STACK/STAGE/APP added by GuCDK
			// https://github.com/guardian/cdk/blob/5569c749211b518001666cffb558fe403ff0539c/src/constructs/lambda/lambda.ts#L134-L138
			App: props.app,
			Stack: scope.stack,
			Stage: scope.stage,
		};

		const finalProps = {
			...defaultProps(props.app, deprecatedVars),
			...props,
		};

		super(scope, id, finalProps);
	}
}
