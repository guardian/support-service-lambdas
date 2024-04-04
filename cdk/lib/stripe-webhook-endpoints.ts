import path from "path";
import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration} from "aws-cdk-lib";
import {CfnBasePathMapping, CfnDomainName} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {Effect,  Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";
import {CfnInclude} from "aws-cdk-lib/cloudformation-include";

export interface StripeWebhookEndpointsProps extends GuStackProps {
    stack: string;
    stage: string;
    deployBucket: string;
    certificateId: string;
    domainName: string;
    hostedZoneId: string;
}

export class StripeWebhookEndpoints extends GuStack {
    constructor(scope: App, id: string, props: StripeWebhookEndpointsProps) {
        super(scope, id, props);

        const app = "stripe-webhook-endpoints";

        // ---- Existing CFN template ---- //
        const yamlTemplateFilePath = path.join(__dirname, "../..", "handlers/stripe-webhook-endpoints/cfn.yaml");
        new CfnInclude(this, "YamlTemplate", {
            templateFile: yamlTemplateFilePath,
        });

        // ---- API-triggered lambda functions ---- //

        //PaymentIntentIssuesLambda
        const paymentIntentIssuesLambda = new GuLambdaFunction(this,"payment-intent-issues-cdk-lambda", {
                app: app,
                description: "A lambda for handling payment intent issues (cancellation, failure, action required)",
                functionName: `stripe-payment-intent-issues-cdk-${this.stage}`,
                fileName: `${app}.jar`,
                handler: "com.gu.paymentIntentIssues.Lambda::handler",
                runtime: Runtime.JAVA_11,
                memorySize: 512,
                timeout: Duration.seconds(300),
                environment: {
                    App: app,
                    Stack: this.stack,
                    Stage: this.stage,
                },
            }
        );

        //CustomerUpdatedLambda
        const customerUpdatedLambda = new GuLambdaFunction(this, "customer-updated-cdk-lambda", {
                app: app,
                description: "A lambda for handling customer updates",
                functionName: `stripe-customer-updated-cdk-${this.stage}`,
                fileName: `${app}.jar`,
                handler: "com.gu.stripeCardUpdated.Lambda::apply",
                runtime: Runtime.JAVA_11,
                memorySize: 1536,
                timeout: Duration.seconds(900),
                environment: {
                    App: app,
                    Stack: this.stack,
                    Stage: this.stage,
                },
            }
        );

        // Wire up the API
        // ---- API gateway ---- //
        const stripeWebhookEndpointsApi =  new GuApiGatewayWithLambdaByPath(this, {
            app: "stripe-webhook-endpoints",
            targets: [
                {
                    path: "/payment-intent-issue",
                    httpMethod: "POST",
                    lambda: paymentIntentIssuesLambda,
                },
                {
                    path: "/customer-updated",
                    httpMethod: "POST",
                    lambda: customerUpdatedLambda,
                },
            ],
            // Create an alarm
            monitoringConfiguration: {
                snsTopicName: "conversion-dev",
                http5xxAlarm: {
                    tolerated5xxPercentage: 1,
                },
            },
        });

        // ---- Alarms ---- //
        const alarmName = (shortDescription: string) =>
            `STRIPE-WEBHOOK-ENDPOINTS-CDK- ${this.stage} ${shortDescription}`;

        const alarmDescription = (description: string) =>
            `Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

        new GuAlarm(this, "ApiGateway4XXAlarmCDK", {
            app,
            alarmName: alarmName("API gateway 4XX response"),
            alarmDescription: alarmDescription(
                "Stripe Webhook Endpoints received an invalid request"
            ),
            evaluationPeriods: 1,
            threshold: 1,
            snsTopicName: "conversion-dev",
            actionsEnabled: this.stage === "PROD",
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            metric: new Metric({
                metricName: "4XXError",
                namespace: "AWS/ApiGateway",
                statistic: "Sum",
                period: Duration.seconds(300),
                dimensionsMap: {
                    ApiName: `${app}-${this.stage}`,
                },
            }),
        });

        new GuAlarm(this, 'ApiGateway5XXAlarmCDK', {
            app,
            alarmName: alarmName("API gateway 5XX error"),
            alarmDescription: `stripe-webhook-endpoints-${this.stage} exceeded 1% 5XX error rate`,
            evaluationPeriods: 1,
            threshold: 1,
            actionsEnabled: this.stage === "PROD",
            snsTopicName: "conversion-dev",
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            metric: new Metric({
                metricName: "5XXError",
                namespace: "AWS/ApiGateway",
                statistic: "Sum",
                period: Duration.seconds(60),
                dimensionsMap: {
                    ApiName:`${app}-${this.stage}`,
                }
            }),
        });

        // ---- DNS ---- //
        const certificateArn = `arn:aws:acm:${this.region}:${this.account}:certificate/${props.certificateId}`;

        const cfnDomainName = new CfnDomainName(this, "StripeWebhookEndpointsDomainName", {
            domainName: props.domainName,
            regionalCertificateArn: certificateArn,
            endpointConfiguration: {
                types: ["REGIONAL"]
            }
        });

        new CfnBasePathMapping(this, "BasePathMapping", {
            domainName: cfnDomainName.ref,
            // Uncomment the lines below to reroute traffic to the new API Gateway instance
            restApiId: stripeWebhookEndpointsApi.api.restApiId,
            stage: stripeWebhookEndpointsApi.api.deploymentStage.stageName,
            // Uncomment the lines below to reroute traffic to the old (existing) API Gateway instance
            // restApiId: yamlDefinedResources.getResource("ServerlessRestApi").ref,
            // stage: props.stage,
        });

        new CfnRecordSet(this, "DNSRecord", {
            name: props.domainName,
            type: "CNAME",
            hostedZoneId: props.hostedZoneId,
            ttl: "120",
            resourceRecords: [cfnDomainName.attrRegionalDomainName],
        });


        // ---- Apply policies ---- //
        const ssmInlinePolicy: Policy = new Policy(this, "SSM inline policy", {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["ssm:GetParametersByPath"],
                    resources: [
                        `arn:aws:ssm:${this.region}:${this.account}:parameter/${props.stage}/membership/payment-intent-issues/*`,
                    ],
                }),
            ],
        });

        const s3InlinePolicy: Policy = new Policy(this, "S3 inline policy", {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["s3:GetObject"],
                    resources: ["arn:aws:s3::*:membership-dist/*"],
                }),
            ],
        });

        const s3InlinePolicyForCustomerUpdated: Policy = new Policy(this, "S3 inline policy For Customer Updated lambda", {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["s3:GetObject"],
                    resources: [
                        `arn:aws:s3::*:membership-dist/*`,
                        `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${props.stage}/zuoraRest-${props.stage}.*.json`,
                        `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${props.stage}/trustedApi-${props.stage}.*.json`,
                        `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${props.stage}/stripe-${props.stage}.*.json`,
                    ],
                }),
            ],
        });

        paymentIntentIssuesLambda.role?.attachInlinePolicy(ssmInlinePolicy);
        paymentIntentIssuesLambda.role?.attachInlinePolicy(s3InlinePolicy);
        customerUpdatedLambda.role?.attachInlinePolicy(ssmInlinePolicy);
        customerUpdatedLambda.role?.attachInlinePolicy(s3InlinePolicyForCustomerUpdated);
    }
}