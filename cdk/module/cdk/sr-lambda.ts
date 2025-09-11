import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { Duration } from 'aws-cdk-lib';
import { LoggingFormat, type Runtime } from 'aws-cdk-lib/aws-lambda';
import { nodeVersion } from '../../lib/node-version';

interface SrLambdaProps {
	app: string;
	fileName: string;
	handler: string;
	functionName?: string;
	runtime?: Runtime;
	loggingFormat?: LoggingFormat;
	memorySize?: number;
	timeout?: Duration;
	// Allow any other props that GuLambdaFunction accepts
	[key: string]: unknown;
}

/**
 * Standard lambda configuration for support-service-lambdas.
 *
 * Provides sensible defaults for:
 * - loggingFormat: LoggingFormat.TEXT (per repo standard from PR #2660)
 * - runtime: nodeVersion (NODEJS_20_X for TypeScript lambdas)
 * - memorySize: 1024 (common default)
 * - timeout: 15 seconds (suitable for most HTTP APIs)
 *
 * All defaults can be overridden when needed.
 */
export class SrLambda extends GuLambdaFunction {
	constructor(scope: GuStack, id: string, props: SrLambdaProps) {
		const defaultProps = {
			runtime: nodeVersion,
			loggingFormat: LoggingFormat.TEXT,
			memorySize: 1024,
			timeout: Duration.seconds(15),
		};

		const finalProps = {
			...defaultProps,
			...props,
		};

		super(scope, id, finalProps);
	}
}
