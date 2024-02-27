import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import { GuLambdaFunction } from "@guardian/cdk/lib/constructs/lambda";
import type { App } from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ApiGW from 'aws-cdk-lib/aws-apigateway';

const appName = "stripe-webhook-endpoints";

export class AwsSqsDirectIntegrationStack extends GuStack {
    constructor(scope: App, id: string, props: GuStackProps) {
        super(scope, id, props);

        const queueName = `stripe-webhook-endpoints-${props.stage}`;

        // role
        const integrationRole = new IAM.Role(this, 'integration-role', {
            assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com'),
        });

        // queue
        const queue = new sqs.Queue(this,`${appName}Queue`, {
            encryption: sqs.QueueEncryption.KMS_MANAGED,
        });

        // grant sqs:SendMessage* to Api Gateway Role
        queue.grantSendMessages(integrationRole);

        // Api Gateway Direct Integration
        const sendMessageIntegration = new ApiGW.AwsIntegration({
            service: 'sqs',
            path: `${process.env.CDK_DEFAULT_ACCOUNT}/${queue.queueName}`,
            integrationHttpMethod: 'POST',
            options: {
                credentialsRole: integrationRole,
                requestParameters: {
                    'integration.request.header.Content-Type': `'application/x-www-form-urlencoded'`,
                },
                requestTemplates: {
                    'application/json': 'Action=SendMessage&MessageBody=$input.body',
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                    },
                    {
                        statusCode: '400',
                    },
                    {
                        statusCode: '500',
                    }
                ]
            },
        });

        // Rest Api
        const api = new ApiGW.RestApi(this, 'api', {});

        // post method
        api.root.addMethod('POST', sendMessageIntegration, {
            methodResponses: [
                {
                    statusCode: '400',
                },
                {
                    statusCode: '200',
                },
                {
                    statusCode: '500',
                }
            ]
        });
    }

    // Create a role
    const role = new Role(this, "stripe-webhook-endpoints-sqs-lambda-role", {
        roleName: `sqs-lambda-${this.stage}`,
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
    new PolicyStatement({
                            actions: [
                                "logs:CreateLogGroup",
                                "logs:CreateLogStream",
                                "logs:PutLogEvents",
                            ],
                            resources: ["*"],
                        })
);
    role.addToPolicy(
    new PolicyStatement({
                            actions: ["ssm:GetParameter"],
                            resources: [
                                `arn:aws:ssm:${this.region}:${this.account}:parameter/${appName}/${props.stage}/gcp-wif-credentials-config`,
                            ],
                        })
);
    
    new GuLambdaFunction(this, `${appName}Lambda`, {
        app: appName,
        runtime: Runtime.JAVA_11_CORRETTO,
        fileName: `${appName}.jar`,
        functionName: `${appName}-${props.stage}`,
        handler: "com.gu.paymentIntentIssues.Lambda::handler",
        events: [eventSource],
        timeout: Duration.minutes(2),
        role,
    });
}
}


