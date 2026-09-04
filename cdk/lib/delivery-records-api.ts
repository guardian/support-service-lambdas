import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import type { IConstruct } from 'constructs/lib/construct';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrLambdaErrorAlarm } from './cdk/SrLambdaErrorAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class DeliveryRecordsApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stack: 'support', stage, app: 'delivery-records-api' });

		const isProd = stage === 'PROD';
		// const mappings = {
		//     domainName: {
		//         CODE: "delivery-records-api-code.support.guardianapis.com",
		//         PROD: "delivery-records-api.support.guardianapis.com"
		//     },
		//     apiName: {
		//         CODE: "delivery-records-api-CODE",
		//         PROD: "delivery-records-api-PROD"
		//     }
		// }

		const lambda = new SrApiLambda(this, 'Lambda', {
			apiDescriptionOverride:
				'api for accessing delivery records in salesforce',
			lambdaOverrides: {
				functionName: `delivery-records-api-${stage}`,
				runtime: Runtime.JAVA_21,
				architecture: Architecture.ARM_64,
				fileName: 'delivery-records-api.jar',
				handler: 'com.gu.delivery_records_api.Handler::handle',
				memorySize: 1536,
				timeout: Duration.minutes(5),
				description: 'api for accessing delivery records in salesforce',
				environment: {
					Stage: stage,
				},
			},
			isPublic: false,
			monitoring: {
				errorImpact:
					'delivery records for a subscription cannot be retrieved, so customers and CSRs may not be able to view delivery history in manage-frontend',
			},
		});

		const s3GetObject = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['s3:GetObject'],
			resources: [
				`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${stage}/*`,
			],
		});

		lambda.addToRolePolicy(s3GetObject);

		let failureAlarm: SrLambdaErrorAlarm | undefined;
		if (isProd) {
			failureAlarm = new SrLambdaErrorAlarm(this, 'FailureAlarm', {
				lambdaFunctionName: lambda.functionName,
				alarmName: `5XX rate from delivery-records-api-${stage}`,
				errorImpact:
					'delivery records for a subscription cannot be retrieved, so customers and CSRs may not be able to view delivery history in manage-frontend',
				evaluationPeriods: 1,
				threshold: 2,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					period: Duration.minutes(6),
					statistic: 'Sum',
				}),
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: TreatMissingData.NOT_BREACHING,
			});
		}

		const printPaths = (construct: IConstruct, path: string) => {
			const currentPath = path
				? `${path}/${construct.node.id}`
				: construct.node.id;
			console.log(currentPath);
			construct.node.children.forEach((child) =>
				printPaths(child, currentPath),
			);
		};
		printPaths(lambda, '');

		const restApi = lambda.node.findChild('RestApi');
		const forcedLogicalIds: Record<string, IConstruct> = {
			DeliveryRecordsApi: restApi,
			DeliveryRecordsApiDeployment: restApi.node.findChild('Deployment'),
			DeliveryRecordsApiStage: restApi.node.findChild(
				`DeploymentStage.${stage}`,
			),
			DeliveryRecordsApiCloudWatchRole:
				restApi.node.findChild('CloudWatchRole'),
			DeliveryRecordsApiAnyMethod: restApi.node
				.findChild('Default')
				.node.findChild('ANY'),
			DeliveryRecordsApiProxyResource: restApi.node
				.findChild('Default')
				.node.findChild('{proxy+}'),
			DeliveryRecordsApiProxyAnyMethod: restApi.node
				.findChild('Default')
				.node.findChild('{proxy+}')
				.node.findChild('ANY'),
			DeliveryRecordsApiUsagePlan: restApi.node.findChild('UsagePlan'),
			DeliveryRecordsApiLambda: lambda,
			DeliveryRecordsApiRole: lambda.node.findChild('ServiceRole'),
			DeliveryRecordsApiDefaultPolicy: lambda.node
				.findChild('ServiceRole')
				.node.findChild('DefaultPolicy'),
			DeliveryRecordsApiKey: restApi.node.findChild('ApiKey'),
			...(failureAlarm
				? {
						// 'DeliveryRecordsApiFailureAlarm': failureAlarm,
						// 'DeliveryRecordsApiScheduleRule': lambda.node.findChild('Rule0'),
					}
				: {}),
		};

		Object.entries(forcedLogicalIds).forEach(([logicalId, construct]) => {
			this.overrideLogicalId(construct, {
				logicalId,
				reason:
					'Keep resource names consistent with the original cfn template.',
			});
		});

		lambda.domain.cfnDomainName.overrideLogicalId(
			'DeliveryRecordsApiDomainName',
		);
		lambda.domain.basePathMapping.overrideLogicalId(
			'DeliveryRecordsApiBasePathMapping',
		);
		lambda.domain.dnsRecord.overrideLogicalId('DeliveryRecordsApiDNSRecord');
	}
}
