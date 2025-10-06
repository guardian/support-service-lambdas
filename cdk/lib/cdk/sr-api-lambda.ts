import { GuApiLambda, type GuApiLambdaProps } from '@guardian/cdk';
import type { Identity } from '@guardian/cdk/lib/constructs/core';
import { Duration } from 'aws-cdk-lib';
import { ApiKeySourceType } from 'aws-cdk-lib/aws-apigateway';
import type { SrLambdaProps } from './sr-lambda';
import { getLambdaDefaultProps, getNameWithStage } from './sr-lambda';
import type { SrStack } from './sr-stack';

function getApiLambdaDefaultProps(scope: Identity, props: SrApiLambdaProps) {
	return {
		...getLambdaDefaultProps(scope, props.nameSuffix),
		timeout: Duration.seconds(300),
		monitoringConfiguration: {
			noMonitoring: true, // we don't use the standard GuCDK alarms due to low traffic
		} as const,
		api: {
			id: getNameWithStage(scope, props.nameSuffix),
			restApiName: getNameWithStage(scope, props.nameSuffix),
			description: props.apiDescriptionOverride ?? 'API Gateway created by CDK',
			proxy: true,
			deployOptions: {
				stageName: scope.stage,
			},
			apiKeySourceType: ApiKeySourceType.HEADER,
			defaultMethodOptions: {
				apiKeyRequired: true,
			},
		},
	};
}

type ApiDefaultProps = ReturnType<typeof getApiLambdaDefaultProps>;
type SrApiLambdaOverrides = Omit<GuApiLambdaProps, keyof ApiDefaultProps> &
	Partial<ApiDefaultProps>;
type SrApiLambdaProps = SrLambdaProps & { apiDescriptionOverride?: string };

export class SrApiLambda extends GuApiLambda {
	constructor(
		scope: SrStack,
		id: string,
		lambdaOverrides: SrApiLambdaOverrides,
		props: SrApiLambdaProps,
	) {
		const defaultProps = getApiLambdaDefaultProps(scope, props);
		const deprecatedVars = {
			// for some reason we often use these instead of the upper case STACK/STAGE/APP added by GuCDK
			// https://github.com/guardian/cdk/blob/5569c749211b518001666cffb558fe403ff0539c/src/constructs/lambda/lambda.ts#L134-L138
			App: scope.app,
			Stack: scope.stack,
			Stage: scope.stage,
		};
		const finalProps = {
			...defaultProps,
			...lambdaOverrides,
			environment: {
				...defaultProps.environment,
				...deprecatedVars,
				...lambdaOverrides.environment,
			},
		};

		super(scope, id, finalProps);
	}
}
