import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type { GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration} from "aws-cdk-lib";
import {ApiKey, CfnUsagePlanKey, Cors, UsagePlan} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnInclude} from "aws-cdk-lib/cloudformation-include";

export class BatchEmailSender extends GuStack {
    constructor(scope: App, id: string, props: GuStackProps) {
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
            functionName: `batch-email-sender-${this.stage}`,
            runtime: Runtime.JAVA_11,
            fileName: "batch-email-sender.jar",
            memorySize: 1536,
            timeout: Duration.seconds(300),
            environment: {
                "Stage": this.stage,
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
            name: `batch-email-sender-api-usage-plan-${this.stage}`,
            apiStages: [
                {
                    api: batchEmailSenderApi.api,
                    stage: batchEmailSenderApi.api.deploymentStage
                }
            ]
        })

        const apiKey = new ApiKey(this, "BatchEmailSenderApiKey", {
            apiKeyName: `batch-email-sender-api-key-${this.stage}`,
            description: "Key required to call batch email sender API",
            enabled: true,
        })

        new CfnUsagePlanKey(this, "BatchEmailSenderUsagePlanKey", {
            keyId: apiKey.keyId,
            keyType: "API_KEY",
            usagePlanId: usagePlan.usagePlanId,
        })


        // ---- Alarms ---- //
        new GuAlarm(this, 'FailedEmailApiAlarm', {
            app,
            alarmName: "URGENT 9-5 - PROD: Failed to send email triggered by Salesforce - 5XXError",
            alarmDescription: "API responded with 5xx to Salesforce meaning some emails failed to send. Logs at /aws/lambda/batch-email-sender-PROD repo at https://github.com/guardian/support-service-lambdas/blob/main/handlers/batch-email-sender/",
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
            alarmName: "URGENT 9-5 - PROD: Failed to send email triggered by Salesforce - Lambda crash",
            alarmDescription: "Lambda crashed unexpectedely meaning email message sent from Salesforce to the Service Layer could not be processed. Logs at /aws/lambda/batch-email-sender-PROD repo at https://github.com/guardian/support-service-lambdas/blob/main/handlers/batch-email-sender/",
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


        // ---- Apply policies ---- //
        // TODO
    }
}