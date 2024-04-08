import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration, Fn} from "aws-cdk-lib";
import {ApiKey, CfnBasePathMapping, CfnDomainName, CfnUsagePlanKey, Cors, UsagePlan} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {Effect, Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";

export interface NewProductApiProps extends GuStackProps {
  domainName: string;
  hostedZoneId: string;
  certificateId: string;
  apiGatewayTargetDomainName: string;
  zuoraCatalogLocation: string;
  fulfilmentDateCalculatorS3Resource: string;
}

export class NewProductApi extends GuStack {
  constructor(scope: App, id: string, props: NewProductApiProps) {
    super(scope, id, props);


    // ---- Miscellaneous constants ---- //
    const isProd = this.stage === 'PROD';
    const app = "new-product-api";
    const runtime = Runtime.JAVA_21;
    const fileName = "new-product-api.jar";
    const memorySize = 1536;
    const timeout = Duration.seconds(300);
    const environment = {
      "Stage": this.stage,
      "EmailQueueName": Fn.importValue(`comms-${this.stage}-EmailQueueName`)
    };
    const sharedLambdaProps = {
      app,
      runtime,
      fileName,
      memorySize,
      timeout,
      environment,
    };


    // ---- API-triggered lambda functions ---- //
    const addSubscriptionLambda = new GuLambdaFunction(this, "add-subscription", {
      handler: "com.gu.newproduct.api.addsubscription.Handler::apply",
      functionName: `add-subscription-${this.stage}`,
      ...sharedLambdaProps,
    });

    const productCatalogLambda = new GuLambdaFunction(this, "product-catalog", {
      handler: "com.gu.newproduct.api.productcatalog.Handler::apply",
      functionName: `product-catalog-${this.stage}`,
      ...sharedLambdaProps,
    });


    // ---- API gateway ---- //
    const newProductApi = new GuApiGatewayWithLambdaByPath(this, {
      app,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
      monitoringConfiguration: { noMonitoring: true },
      targets: [
        {
          path: "/add-subscription",
          httpMethod: "POST",
          lambda: addSubscriptionLambda,
          apiKeyRequired: true,
        },
        {
          path: "/product-catalog",
          httpMethod: "GET",
          lambda: productCatalogLambda,
          apiKeyRequired: true,
        },
      ],
    })


    // ---- Alarms ---- //
    new GuAlarm(this, 'ApiGateway4XXAlarm', {
      app,
      alarmName: `new-product-api-${this.stage} API gateway 4XX response`,
      alarmDescription: "New Product API received an invalid request",
      evaluationPeriods: 1,
      threshold: 6,
      actionsEnabled: isProd,
      snsTopicName: "retention-dev",
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      metric: new Metric({
        metricName: "4XXError",
        namespace: "AWS/ApiGateway",
        statistic: "Sum",
        period: Duration.seconds(900),
        dimensionsMap: {
          ApiName: `support-reminders-${this.stage}`,
        }
      }),
    });

    new GuAlarm(this, 'ApiGateway5XXAlarm', {
      app,
      alarmName: `new-product-api-${this.stage} 5XX error`,
      alarmDescription: `new-product-api-${this.stage} exceeded 1% 5XX error rate`,
      evaluationPeriods: 1,
      threshold: 1,
      actionsEnabled: isProd,
      snsTopicName: "retention-dev",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      metric: new Metric({
        metricName: "5XXError",
        namespace: "AWS/ApiGateway",
        statistic: "Sum",
        period: Duration.seconds(60),
        dimensionsMap: {
          ApiName: `support-reminders-${this.stage}`,
        }
      }),
    });


    // ---- Usage plan and API key ---- //
    const usagePlan = new UsagePlan(this, "NewProductUsagePlan", {
      name: `new-product-api-usage-plan-${this.stage}`,
      apiStages: [
        {
          api: newProductApi.api,
          stage: newProductApi.api.deploymentStage
        }
      ]
    })

    const apiKey = new ApiKey(this, "NewProductApiKey", {
      apiKeyName: `new-product-api-key-${this.stage}`,
      description: "Key required to call new product API",
      enabled: true,
    })

    new CfnUsagePlanKey(this, "NewProductUsagePlanKey", {
      keyId: apiKey.keyId,
      keyType: "API_KEY",
      usagePlanId: usagePlan.usagePlanId,
    })


    // ---- DNS ---- //
    const certificateArn = `arn:aws:acm:${this.region}:${this.account}:certificate/${props.certificateId}`;

    const cfnDomainName = new CfnDomainName(this, "NewProductDomainName", {
      domainName: props.domainName,
      regionalCertificateArn: certificateArn,
      endpointConfiguration: {
        types: ["REGIONAL"]
      }
    });

    new CfnBasePathMapping(this, "NewProductBasePathMapping", {
      domainName: cfnDomainName.ref,
      restApiId: newProductApi.api.restApiId,
      stage: newProductApi.api.deploymentStage.stageName,
    });

    new CfnRecordSet(this, "NewProductDNSRecord", {
      name: props.domainName,
      type: "CNAME",
      hostedZoneId: props.hostedZoneId,
      ttl: "120",
      resourceRecords: [
        cfnDomainName.attrRegionalDomainName
      ],
    });


    // ---- Apply policies ---- //
    const cloudwatchLogsInlinePolicy = (lambda: GuLambdaFunction, idPrefix: string): Policy => {
      return new Policy(this, `${idPrefix}-cloudwatch-logs-inline-policy`, {
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"
            ],
            resources: [
              `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${lambda.functionName}:log-stream:*`
            ]
          }),
        ],
      })
    }

    const addSubscriptionS3InlinePolicy: Policy = new Policy(this, "add-subscription-s3-inline-policy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:GetObject"
          ],
          resources: [
            `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/zuoraRest-${this.stage}*.json`,
            `arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/paperround-${this.stage}*.json`,
          ]
        }),
      ],
    })

    const sharedS3InlinePolicy: Policy = new Policy(this, "shared-s3-inline-policy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "s3:GetObject"
          ],
          resources: [
            `arn:aws:s3:::fulfilment-date-calculator-${this.stage.toLowerCase()}/*`,
            `arn:aws:s3:::gu-zuora-catalog/${this.stage}/Zuora-${this.stage}/catalog.json`
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
            "sqs:SendMessage"
          ],
          resources: [
            `arn:aws:sqs:${this.region}:${this.account}:braze-emails-${this.stage}`
          ]
        }),
      ],
    })

    addSubscriptionLambda.role?.attachInlinePolicy(cloudwatchLogsInlinePolicy(addSubscriptionLambda, "add-subscription"))
    addSubscriptionLambda.role?.attachInlinePolicy(sharedS3InlinePolicy)
    addSubscriptionLambda.role?.attachInlinePolicy(addSubscriptionS3InlinePolicy)
    addSubscriptionLambda.role?.attachInlinePolicy(sqsInlinePolicy)

    productCatalogLambda.role?.attachInlinePolicy(cloudwatchLogsInlinePolicy(productCatalogLambda, "product-catalog"))
    productCatalogLambda.role?.attachInlinePolicy(sharedS3InlinePolicy)
  }
}