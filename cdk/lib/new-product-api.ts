import { join } from "path";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import type { App } from "aws-cdk-lib";
import { CfnInclude } from "aws-cdk-lib/cloudformation-include";
import {GuVpc} from "@guardian/cdk/lib/constructs/ec2";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnBasePathMapping, CfnDomainName, Cors} from "aws-cdk-lib/aws-apigateway";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import {GuApiGatewayWithLambdaByPath} from "@guardian/cdk";

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
    const app = "new-product-api";
    const runtime = Runtime.JAVA_11;
    const fileName = "new-product-api.jar";
    const environment = {
      "Stage": this.stage,
    };
    const sharedLambdaProps = {
      app,
      runtime,
      fileName,
      environment,
    };


    // ---- API-triggered lambda functions ---- //
    const addSubscriptionLambda = new GuLambdaFunction(this, "add-subscription", {
      handler: "com.gu.newproduct.api.addsubscription.Handler::apply",
      functionName: `new-product-api-add-subscription-${this.stage}`,
      ...sharedLambdaProps,
    });

    const productCatalogLambda = new GuLambdaFunction(this, "product-catalog", {
      handler: "com.gu.newproduct.api.productcatalog.Handler::apply",
      functionName: `new-product-api-product-catalog-${this.stage}`,
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
  }
}
