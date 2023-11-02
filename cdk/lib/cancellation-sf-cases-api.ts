import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type { GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration} from "aws-cdk-lib";
import {ApiKey, CfnBasePathMapping, CfnDomainName, CfnUsagePlanKey, Cors, UsagePlan} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {Effect, Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";
import {CfnInclude} from "aws-cdk-lib/cloudformation-include";

export interface CancellationSfCasesApiProps extends GuStackProps {
    certificateId: string;
    domainName: string;
    hostedZoneId: string;
}

export class CancellationSfCasesApi extends GuStack {
    constructor(scope: App, id: string, props: CancellationSfCasesApiProps) {
        super(scope, id, props);
        const yamlTemplateFilePath = `${__dirname}/../../handlers/cancellation-sf-cases-api/cfn.yaml`;
        new CfnInclude(this, "YamlTemplate", {
            templateFile: yamlTemplateFilePath,
        });


        // ---- Miscellaneous constants ---- //
        const isProd = this.stage === 'PROD';
        const app = "cancellation-sf-cases-api";


        // ---- API-triggered lambda functions ---- //
        const cancellationSFCasesApiLambda = new GuLambdaFunction(this, "CancellationSFCasesApiLambda-CDK", {
            app,
            handler: "com.gu.cancellation.sf_cases.Handler::handle",
            functionName: `cancellation-sf-cases-api-CDK-${this.stage}`,
            runtime: Runtime.JAVA_11,
            fileName: "cancellation-sf-cases-api.jar",
            memorySize: 1536,
            timeout: Duration.seconds(300),
            environment: {
                "Stage": this.stage,
            },
        });


        // ---- API gateway ---- //
        const cancellationSFCasesApi = new GuApiGatewayWithLambdaByPath(this, {
            app,
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: ["Content-Type"],
            },
            monitoringConfiguration: { noMonitoring: true },
            targets: [
                {
                    path: "{proxy+}",
                    httpMethod: "POST",
                    lambda: cancellationSFCasesApiLambda,
                    apiKeyRequired: true,
                },
            ],
        })


        // ---- Usage plan and API key ---- //
        const cancellationSFCasesApiUsagePlan = new UsagePlan(this, "CancellationSFCasesApiUsagePlan-CDK", {
            name: `cancellation-sf-cases-api-${this.stage}-CDK`,
            apiStages: [
                {
                    api: cancellationSFCasesApi.api,
                    stage: cancellationSFCasesApi.api.deploymentStage
                }
            ]
        })

        const cancellationSFCasesApiKey = new ApiKey(this, "CancellationSFCasesApiKey-CDK", {
            apiKeyName: `cancellation-sf-cases-api-key-${this.stage}-CDK`,
            description: "Used by manage-frontend",
            enabled: true,
        })

        new CfnUsagePlanKey(this, "CancellationSFCasesApiUsagePlanKey-CDK", {
            keyId: cancellationSFCasesApiKey.keyId,
            keyType: "API_KEY",
            usagePlanId: cancellationSFCasesApiUsagePlan.usagePlanId,
        })


        // ---- Alarms ---- //
        new GuAlarm(this, 'Api5xxAlarm-CDK', {
            app,
            alarmName: `5XX from cancellation-sf-cases-api-${this.stage}-CDK`,
            evaluationPeriods: 1,
            threshold: 1,
            actionsEnabled: isProd,
            snsTopicName: "retention-dev",
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            metric: new Metric({
                metricName: "5XXError",
                namespace: "AWS/ApiGateway",
                statistic: "Sum",
                period: Duration.seconds(3600),
                dimensionsMap: {
                    ApiName: cancellationSFCasesApi.api.restApiName
                }
            }),
        });


        // ---- DNS ---- //
        const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${props.certificateId}`;

        const cfnDomainName = new CfnDomainName(this, "DomainName-CDK", {
            domainName: props.domainName,
            regionalCertificateArn: certificateArn,
            endpointConfiguration: {
                types: ["REGIONAL"]
            }
        });

        new CfnBasePathMapping(this, "BasePathMapping-CDK", {
            domainName: cfnDomainName.ref,
            restApiId: cancellationSFCasesApi.api.restApiId,
            stage: cancellationSFCasesApi.api.deploymentStage.stageName,
        });

        new CfnRecordSet(this, "DNSRecord-CDK", {
            name: props.domainName,
            type: "CNAME",
            hostedZoneId: props.hostedZoneId,
            ttl: "60",
            resourceRecords: [
                cfnDomainName.attrRegionalDomainName
            ],
        });


        // ---- Apply policies ---- //
        const lambdaPolicy: Policy = new Policy(this, "LambdaPolicy-CDK", {
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
                        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/cancellation-sf-cases-api-${this.stage}:log-stream:*`,
                    ]
                }),
            ],
        })

        const readPrivateCredentials: Policy = new Policy(this, "ReadPrivateCredentials-CDK", {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "s3:GetObject",
                    ],
                    resources: [
                        `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/*`,
                    ]
                }),
            ],
        })

        cancellationSFCasesApiLambda.role?.attachInlinePolicy(lambdaPolicy)
        cancellationSFCasesApiLambda.role?.attachInlinePolicy(readPrivateCredentials)
    }
}