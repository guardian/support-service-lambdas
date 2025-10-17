import { Duration } from 'aws-cdk-lib';
import { ApiKeySourceType, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { SrApiGateway5xxAlarm } from './SrApiGateway5xxAlarm';
import type { SrLambdaProps } from './SrLambda';
import { getNameWithStage, SrLambda } from './SrLambda';
import type { SrMonitoring } from './SrLambdaAlarm';
import type { SrRestDomainProps } from './SrRestDomain';
import { SrRestDomain } from './SrRestDomain';
import type { SrStack } from './SrStack';

type SrApiLambdaProps = SrLambdaProps & {
	/**
	 * for legacy use, if we want a specific description for the API gateway.
	 */
	apiDescriptionOverride?: string;
	/**
	 * If set, the API gateway resources will not require an API key
	 */
	isPublic?: boolean;
	/**
	 * do we want to disable standard SrCDK 5xx alarm or override any properties?
	 */
	monitoring: SrMonitoring;
	/**
	 * By default, you get a ssl enabled url e.g. https://discount-api.support.guardianapis.com/, but you can override aspects
	 * of it here or add a public facing fastly enabled domain.
	 */
	srRestDomainProps?: SrRestDomainProps;
};

const defaultProps = {
	timeout: Duration.seconds(300),
};

/**
 * This creates a lambda with an API gateway in front, and makes it available on a suitable URL, according to SR standards.
 */
export class SrApiLambda extends SrLambda {
	public readonly api: LambdaRestApi;
	readonly domain: SrRestDomain;
	constructor(scope: SrStack, id: string, props: SrApiLambdaProps) {
		const finalProps = {
			nameSuffix: props.nameSuffix,
			lambdaOverrides: {
				...defaultProps,
				...props.lambdaOverrides,
			},
			legacyId: props.legacyId,
		};

		super(scope, id, finalProps);

		this.api = new LambdaRestApi(
			this,
			props.legacyId ? getNameWithStage(scope, props.nameSuffix) : 'RestApi',
			{
				handler: this,

				restApiName: getNameWithStage(scope, props.nameSuffix),
				description:
					props.apiDescriptionOverride ?? 'API Gateway created by CDK',
				proxy: true,
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
		);

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
			const apiKey = this.api.addApiKey(
				props.legacyId ? `${scope.app}-key-${scope.stage}` : 'ApiKey',
				{
					apiKeyName: `${scope.app}-key-${scope.stage}`,
				},
			);

			// associate api key to plan
			usagePlan.addApiKey(apiKey);
		}

		this.domain = new SrRestDomain(scope, this.api, props.srRestDomainProps);

		if (scope.stage === 'PROD' && !props.monitoring.noMonitoring) {
			new SrApiGateway5xxAlarm(scope, {
				lambdaFunctionNames: [this.functionName],
				restApi: this.api,
				errorImpact: props.monitoring.errorImpact,
				overrides: props.monitoring,
			});
		}
	}
}
