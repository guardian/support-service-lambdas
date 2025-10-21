import { AwsIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import type { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { SrApiGateway5xxAlarm } from './SrApiGateway5xxAlarm';
import type { SrMonitoring } from './SrLambdaAlarm';
import type { SrStack } from './SrStack';

type ApiGatewayToSqsProps = {
	queue: Queue;
	/**
	 * header names to pull from the request into SQS attributes.
	 *
	 * FIXME if a header is missing, the requester still gets a 200 and the message is silently dropped!
	 */
	includeHeaderNames: string[];
	/**
	 * do we want to disable standard SrCDK 5xx alarm or override any properties?
	 */
	monitoring: SrMonitoring;
};

function iterateParam(targetName: string, sourceName: string) {
	return `#set($json = $json + """${targetName}"":{")
#set($allHeaders = $${sourceName})
#foreach($header in $allHeaders.keySet())
#set($json = $json + """$header"":""$util.escapeJavaScript($allHeaders.get($header)).replaceAll(""\\\\'"",""'"")""")
#if($foreach.hasNext)
#set($json = $json + ",")
#end
#end
#set($json = $json + "},")`;
}

function insertSingleProp(targetName: string, sourceName: string) {
	return `#set($json = $json + """${targetName}"":""$util.escapeJavaScript($${sourceName}).replaceAll(""\\\\'"",""'"")"",")`;
}

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
						// this replicates the key fields of APIGatewayProxyEvent
						'#set($json = "{")',
						iterateParam(`pathParameters`, `input.params().path`),
						iterateParam(`headers`, `input.params().header`),
						iterateParam(`queryStringParameters`, `input.params().querystring`),
						insertSingleProp(`body`, `input.body`),
						insertSingleProp('httpMethod', 'context.httpMethod'),
						insertSingleProp('path', 'context.path'),
						`#set($json = $json + """mappingSource"": ""SrCDK""}")`, // docs and to get the commas right
						`Action=SendMessage&MessageBody=$util.urlEncode($json)`,
					].join('\n'),
				},
				integrationResponses: [
					{
						selectionPattern: '2\\d{2}',
						statusCode: '200',
						responseTemplates: {
							'application/json': '{ "status": "accepted" }',
						},
					},
					{
						statusCode: '500',
						responseTemplates: {
							'application/json':
								'{ "message": "Internal Server Error - could not queue message" }',
						},
					},
				],
			},
		});

		const apiGateway = new RestApi(scope, 'RestApi', {
			restApiName: `${scope.stack}-${scope.stage}-${scope.app}`,
		});

		if (scope.stage === 'PROD' && !props.monitoring.noMonitoring) {
			new SrApiGateway5xxAlarm(scope, {
				errorImpact: props.monitoring.errorImpact,
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
					{
						statusCode: '500',
					},
				],
			});
	}
}
