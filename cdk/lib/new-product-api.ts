import {join} from "path";
import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration, Fn} from "aws-cdk-lib";
import {CfnBasePathMapping, CfnDomainName, Cors} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {Effect, Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";
import {CfnInclude} from "aws-cdk-lib/cloudformation-include";

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


    // ---- CFN template resources ---- //
    const yamlTemplateFilePath = join(__dirname, "../..", "handlers/new-product-api/cfn.yaml");
    new CfnInclude(this, "YamlTemplate", {
      templateFile: yamlTemplateFilePath,
    });


    // ---- Miscellaneous constants ---- //
    const isProd = this.stage === 'PROD';
    const app = "new-product-api";
    const runtime = Runtime.JAVA_11;
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
    const addSubscriptionLambda = new GuLambdaFunction(this, "add-subscription-cdk", {
      handler: "com.gu.newproduct.api.addsubscription.Handler::apply",
      functionName: `add-subscription-cdk-${this.stage}`,
      ...sharedLambdaProps,
    });

    const productCatalogLambda = new GuLambdaFunction(this, "product-catalog-cdk", {
      handler: "com.gu.newproduct.api.productcatalog.Handler::apply",
      functionName: `product-catalog-cdk-${this.stage}`,
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
      monitoringConfiguration: {
        snsTopicName: "retention-dev",
        http5xxAlarm: {
          tolerated5xxPercentage: 1,
        }
      },
      targets: [
        {
          path: "/add-subscription",
          httpMethod: "POST",
          lambda: addSubscriptionLambda,
        },
        {
          path: "/product-catalog",
          httpMethod: "GET",
          lambda: productCatalogLambda,
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


    // ---- DNS ---- //
    // const certificateArn = `arn:aws:acm:${this.region}:${this.account}:certificate/${props.certificateId}`;
    //
    // const cfnDomainName = new CfnDomainName(this, "NewProductDomainName", {
    //   domainName: props.domainName,
    //   regionalCertificateArn: certificateArn,
    //   endpointConfiguration: {
    //     types: ["REGIONAL"]
    //   }
    // });
    //
    // new CfnBasePathMapping(this, "NewProductBasePathMapping", {
    //   domainName: cfnDomainName.ref,
    //   restApiId: newProductApi.api.restApiId,
    //   stage: newProductApi.api.deploymentStage.stageName,
    // });
    //
    // new CfnRecordSet(this, "NewProductDNSRecord", {
    //   name: props.domainName,
    //   type: "CNAME",
    //   hostedZoneId: props.hostedZoneId,
    //   ttl: "120",
    //   resourceRecords: [
    //     cfnDomainName.attrRegionalDomainName
    //   ],
    // });


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
            `arn:aws:s3:::gu-zuora-catalog/${this.stage === "DEV" ? "CODE" : this.stage}/Zuora-${this.stage}/catalog.json`
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
