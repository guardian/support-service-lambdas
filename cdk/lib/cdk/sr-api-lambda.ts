import { GuApiLambda, type GuApiLambdaProps } from '@guardian/cdk';
import type { Identity } from '@guardian/cdk/lib/constructs/core';
import type { GuPolicy } from '@guardian/cdk/lib/constructs/iam/policies/base-policy';
import { Duration } from 'aws-cdk-lib';
import { ApiKeySourceType } from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import type { SrLambdaProps } from './sr-lambda';
import { getLambdaDefaultProps, getNameWithStage } from './sr-lambda';
import type { SrLambdaAlarmProps } from './sr-lambda-alarm';
import { SrLambdaAlarm } from './sr-lambda-alarm';
import type { SrRestDomainProps } from './sr-rest-domain';
import { SrRestDomain } from './sr-rest-domain';
import type { SrStack } from './sr-stack';

function getApiLambdaDefaultProps(scope: Identity, props: SrApiLambdaProps) {
	return {
		...getLambdaDefaultProps(scope, props.nameSuffix),
		timeout: Duration.seconds(300),
		monitoringConfiguration: {
			noMonitoring: true, // we don't use the standard GuCDK alarms due to low traffic
		} as GuApiLambdaProps['monitoringConfiguration'],
		api: {
			id: getNameWithStage(scope, props.nameSuffix),
			restApiName: getNameWithStage(scope, props.nameSuffix),
			description: props.apiDescriptionOverride ?? 'API Gateway created by CDK',
			proxy: false, // add proxy method later, to allow public paths
			deployOptions: {
				stageName: scope.stage,
			},
			...(props.isPublic
				? {}
				: {
						apiKeySourceType: ApiKeySourceType.HEADER,
						defaultMethodOptions: {
							apiKeyRequired: true,
						},
					}),
		},
	};
}

type ApiDefaultProps = ReturnType<typeof getApiLambdaDefaultProps>;
type SrApiLambdaOverrides = Omit<GuApiLambdaProps, keyof ApiDefaultProps> &
	Partial<ApiDefaultProps>;
type SrApiLambdaProps = SrLambdaProps & {
	lambdaOverrides: SrApiLambdaOverrides;
	apiDescriptionOverride?: string;
	isPublic?: boolean;
	errorImpact: string;
	alarmOverrides?: Partial<SrLambdaAlarmProps>;
	srRestDomainOverrides?: SrRestDomainProps;
};

export class SrApiLambda extends GuApiLambda {
	readonly domain: SrRestDomain;
	constructor(scope: SrStack, props: SrApiLambdaProps) {
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
			...props.lambdaOverrides,
			environment: {
				...defaultProps.environment,
				...deprecatedVars,
				...props.lambdaOverrides.environment,
			},
		};

		super(scope, `${scope.app}-lambda`, finalProps);

		// by doing these explicitly rather than using proxy:true, we can later add specific public resources
		this.api.root.addMethod('ANY');
		this.api.root.addResource('{proxy+}').addMethod('ANY');

		if (!props.isPublic) {
			const usagePlan = this.api.addUsagePlan('UsagePlan', {
				name: getNameWithStage(scope, props.nameSuffix),
				description: 'REST endpoints for ' + scope.app,
				apiStages: [
					{
						stage: this.api.deploymentStage,
						api: this.api,
					},
				],
			});

			// create api key
			const apiKey = this.api.addApiKey(`${scope.app}-key-${scope.stage}`, {
				apiKeyName: `${scope.app}-key-${scope.stage}`,
			});

			// associate api key to plan
			usagePlan.addApiKey(apiKey);
		}

		this.domain = new SrRestDomain(
			scope,
			this.api,
			props.srRestDomainOverrides,
		);

		if (
			scope.stage === 'PROD' &&
			finalProps.monitoringConfiguration.noMonitoring
		) {
			new SrLambdaAlarm(scope, 'ApiGateway5XXAlarmCDK', {
				app: scope.app,
				alarmName: getNameWithStage(scope, props.nameSuffix) + ' 5XX errors',
				alarmDescription:
					scope.app +
					' returned a 5XX response search the logs below for "error" for more information. Impact: ' +
					props.errorImpact,
				evaluationPeriods: 1,
				threshold: 1,
				lambdaFunctionNames: this.functionName,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					statistic: 'Sum',
					period: Duration.seconds(60),
					dimensionsMap: {
						ApiName: getNameWithStage(scope, props.nameSuffix),
					},
				}),
				...props.alarmOverrides,
			});
		}
	}

	addPolicies(...policies: GuPolicy[]) {
		policies.forEach((p) => this.role!.attachInlinePolicy(p));
	}

	addPublicPath(path: string) {
		const publicResource = this.api.root.addResource(path);
		publicResource.addMethod('GET', undefined, {
			apiKeyRequired: false,
		});
		publicResource.addResource('{proxy+}').addMethod('GET', undefined, {
			apiKeyRequired: false,
		});
	}
}
