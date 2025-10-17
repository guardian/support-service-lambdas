import { AwsIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import type { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { SrApiGateway5xxAlarm } from './SrApiGateway5xxAlarm';
import type { SrStack } from './SrStack';

type ApiGatewayToSqsProps = {
	queue: Queue;
	includeHeaderNames: string[];
};

/**
 * this takes incoming http requests and puts them on a queue, responding with a 200 OK
 *
 * Useful for webhooks etc.
 */
export class ApiGatewayToSqs extends Construct {
	constructor(scope: SrStack, id: string, props: ApiGatewayToSqsProps) {
		super(scope, id);

		const apiRole = new Role(this, 'Role', {
			assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
		});
		props.queue.grantSendMessages(apiRole);

		const sendMessageIntegration = new AwsIntegration({
			service: 'sqs',
			path: `${scope.account}/${props.queue.queueName}`,
			integrationHttpMethod: 'POST',
			options: {
				credentialsRole: apiRole,
				requestParameters: {
					'integration.request.header.Content-Type':
						"'application/x-www-form-urlencoded'",
				},
				requestTemplates: {
					'application/json': [
						...Object.entries({
							Action: 'SendMessage',
							MessageBody: '$util.urlEncode($input.body)',
						}),
						...props.includeHeaderNames.flatMap((headerName, index) => [
							[`MessageAttribute.${index + 1}.Name`, headerName],
							[`MessageAttribute.${index + 1}.Value.DataType`, 'String'],
							[
								`MessageAttribute.${index + 1}.Value.StringValue`,
								`$method.request.header.${headerName}`,
							],
						]),
					]
						.map(([k, v]) => k + '=' + v)
						.join('&'),
				},
				integrationResponses: [
					{
						statusCode: '200',
						responseTemplates: {
							'application/json': '{ "status": "accepted" }',
						},
					},
				],
			},
		});

		const apiGateway = new RestApi(scope, 'RestApi', {
			restApiName: `${scope.stack}-${scope.stage}-${scope.app}`,
			...props,
		});

		if (scope.stage == 'PROD') {
			new SrApiGateway5xxAlarm(scope, {
				errorImpact: 'unknown',
				restApi: apiGateway,
				lambdaFunctionNames: [],
			});
		}

		apiGateway.root
			.resourceForPath('/')
			.addMethod('POST', sendMessageIntegration, {
				methodResponses: [
					{
						statusCode: '200',
					},
				],
			});
	}
}
