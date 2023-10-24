import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type { GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration, Fn} from "aws-cdk-lib";
import {ApiKey, CfnBasePathMapping, CfnDomainName, CfnUsagePlanKey, Cors, UsagePlan} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {Effect, Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnInclude} from "aws-cdk-lib/cloudformation-include";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";

export interface BatchEmailSenderProps extends GuStackProps {
    certificateId: string;
    domainName: string;
    hostedZoneId: string;
}

export class BatchEmailSender extends GuStack {
    constructor(scope: App, id: string, props: BatchEmailSenderProps) {
        super(scope, id, props);
        const yamlTemplateFilePath = `${__dirname}/../../handlers/batch-email-sender/cfn.yaml`;
        new CfnInclude(this, "YamlTemplate", {
            templateFile: yamlTemplateFilePath,
        });


        // ---- Miscellaneous constants ---- //
        const isProd = this.stage === 'PROD';
        const app = "batch-email-sender";


        // ---- API-triggered lambda functions ---- //
        const batchEmailSenderLambda = new GuLambdaFunction(this, "BatchEmailSenderLambda", {
            app,
            handler: "com.gu.batchemailsender.api.batchemail.Handler::apply",
            functionName: `batch-email-sender-${this.stage}-CDK`,
            runtime: Runtime.JAVA_11,
            fileName: "batch-email-sender.jar",
            memorySize: 1536,
            timeout: Duration.seconds(300),
            environment: {
                "Stage": this.stage,
                "EmailQueueName": Fn.importValue(`comms-${this.stage}-EmailQueueName`)
            },
        });


        // ---- API gateway ---- //
        const batchEmailSenderApi = new GuApiGatewayWithLambdaByPath(this, {
            app,
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: ["Content-Type"],
            },
            monitoringConfiguration: { noMonitoring: true },
            targets: [
                {
                    path: "/email-batch",
                    httpMethod: "POST",
                    lambda: batchEmailSenderLambda,
                    apiKeyRequired: true,
                },
            ],
        })


        // ---- Usage plan and API key ---- //
        const usagePlan = new UsagePlan(this, "BatchEmailSenderUsagePlan", {
            name: `batch-email-sender-api-usage-plan-${this.stage}-CDK`,
            apiStages: [
                {
                    api: batchEmailSenderApi.api,
                    stage: batchEmailSenderApi.api.deploymentStage
                }
            ]
        })

        const apiKey = new ApiKey(this, "BatchEmailSenderApiKey", {
            apiKeyName: `batch-email-sender-api-key-${this.stage}-CDK`,
            description: "Key required to call batch email sender API",
            enabled: true,
        })

        new CfnUsagePlanKey(this, "BatchEmailSenderUsagePlanKey-CDK", {
            keyId: apiKey.keyId,
            keyType: "API_KEY",
            usagePlanId: usagePlan.usagePlanId,
        })


        // ---- Alarms ---- //
        new GuAlarm(this, 'FailedEmailApiAlarm', {
            app,
            alarmName: `URGENT 9-5 - ${this.stage}: Failed to send email triggered by Salesforce - 5XXError (CDK)`,
            alarmDescription: `API responded with 5xx to Salesforce meaning some emails failed to send. Logs at /aws/lambda/batch-email-sender-${this.stage} repo at https://github.com/guardian/support-service-lambdas/blob/main/handlers/batch-email-sender/`,
            evaluationPeriods: 1,
            threshold: 1,
            actionsEnabled: isProd,
            snsTopicName: "retention-dev",
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            metric: new Metric({
                metricName: "5XXError",
                namespace: "AWS/ApiGateway",
                statistic: "Sum",
                period: Duration.seconds(60),
                dimensionsMap: {
                    ApiName: `BatchEmailSender-${this.stage}`,
                }
            }),
        });

        new GuAlarm(this, 'FailedEmailLambdaAlarm', {
            app,
            alarmName: `URGENT 9-5 - ${this.stage}: Failed to send email triggered by Salesforce - Lambda crash (CDK)`,
            alarmDescription: `Lambda crashed unexpectedely meaning email message sent from Salesforce to the Service Layer could not be processed. Logs at /aws/lambda/batch-email-sender-${this.stage} repo at https://github.com/guardian/support-service-lambdas/blob/main/handlers/batch-email-sender/`,
            evaluationPeriods: 1,
            threshold: 1,
            actionsEnabled: isProd,
            snsTopicName: "retention-dev",
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            metric: new Metric({
                metricName: "Errors",
                namespace: "AWS/Lambda",
                statistic: "Sum",
                period: Duration.seconds(300),
                dimensionsMap: {
                    FunctionName: batchEmailSenderLambda.functionName,
                }
            }),
        });


        // ---- DNS ---- //
        const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${props.certificateId}`;

        const cfnDomainName = new CfnDomainName(this, "DomainName", {
            domainName: props.domainName,
            regionalCertificateArn: certificateArn,
            endpointConfiguration: {
                types: ["REGIONAL"]
            }
        });

        new CfnBasePathMapping(this, "BasePathMapping", {
            domainName: cfnDomainName.ref,
            restApiId: batchEmailSenderApi.api.restApiId,
            stage: batchEmailSenderApi.api.deploymentStage.stageName,
        });

        new CfnRecordSet(this, "DNSRecord", {
            name: props.domainName,
            type: "CNAME",
            hostedZoneId: props.hostedZoneId,
            ttl: "60",
            resourceRecords: [
                cfnDomainName.attrRegionalDomainName
            ],
        });


        // ---- Apply policies ---- //
        const cloudwatchLogsInlinePolicy: Policy = new Policy(this, "cloudwatch-logs-inline-policy", {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "lambda:InvokeFunction"
                    ],
                    resources: [
                        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/batch-email-sender-${this.stage}:log-stream:*`,
                    ]
                }),
            ],
        })

        const sqsInlinePolicy: Policy = new Policy(this, "sqs-inline-policy", {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "sqs:GetQueueUrl",
                        "sqs:SendMessage",
                    ],
                    resources: [
                        `arn:aws:sqs:${this.region}:${this.account}:braze-emails-${this.stage}`,
                    ]
                }),
            ],
        })

        batchEmailSenderLambda.role?.attachInlinePolicy(cloudwatchLogsInlinePolicy)
        batchEmailSenderLambda.role?.attachInlinePolicy(sqsInlinePolicy)
    }
}