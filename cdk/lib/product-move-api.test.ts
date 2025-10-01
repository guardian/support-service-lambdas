import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ProductMoveApi } from './product-move-api';

describe('ProductMoveApi stack', () => {
	it('creates the expected resources', () => {
		const app = new App();
		const stack = new ProductMoveApi(app, 'ProductMoveApi', {
			stack: 'support',
			stage: 'TEST',
			domainName: 'product-move-api-test.support.guardianapis.com',
			hostedZoneId: 'Z3KO35ELNWZMSX',
			certificateId: 'b384a6a0-2f54-4874-b99b-96eeff96c009',
		});

		const template = Template.fromStack(stack);

		// Check that main lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'move-product-TEST',
			Handler: 'com.gu.productmove.Handler::handleRequest',
			Runtime: 'java21',
			MemorySize: 6144,
		});

		// Check that refund lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'product-switch-refund-TEST',
			Handler: 'com.gu.productmove.refund.RefundHandler::handleRequest',
			Runtime: 'java21',
			MemorySize: 1024,
		});

		// Check that salesforce tracking lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'product-switch-salesforce-tracking-TEST',
			Handler: 'com.gu.productmove.salesforce.SalesforceHandler::handleRequest',
			Runtime: 'java21',
			MemorySize: 1024,
		});

		// Check that SQS queues are created
		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'product-switch-refund-TEST',
		});

		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'product-switch-refund-dead-letter-TEST',
		});

		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'product-switch-salesforce-tracking-TEST',
		});

		// Check that API Gateway is created
		template.hasResourceProperties('AWS::ApiGateway::RestApi', {
			Name: 'product-move-api-TEST-ApiGateway',
		});

		// Check that custom domain is created
		template.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'product-move-api-test.support.guardianapis.com',
		});

		// Check that usage plan is created
		template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
			UsagePlanName: 'product-move-api-TEST-UsagePlan',
		});
	});

	it('creates alarms only for PROD stage', () => {
		const app = new App();
		const codeStack = new ProductMoveApi(app, 'ProductMoveApiCode', {
			stack: 'support',
			stage: 'CODE',
			domainName: 'product-move-api-code.support.guardianapis.com',
			hostedZoneId: 'Z3KO35ELNWZMSX',
			certificateId: 'b384a6a0-2f54-4874-b99b-96eeff96c009',
		});

		const prodStack = new ProductMoveApi(app, 'ProductMoveApiProd', {
			stack: 'support',
			stage: 'PROD',
			domainName: 'product-move-api.support.guardianapis.com',
			hostedZoneId: 'Z3KO35ELNWZMSX',
			certificateId: 'b384a6a0-2f54-4874-b99b-96eeff96c009',
		});

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should not have alarms
		codeTemplate.resourceCountIs('AWS::CloudWatch::Alarm', 0);

		// PROD should have alarms
		prodTemplate.resourcePropertiesCountIs('AWS::CloudWatch::Alarm', {}, 5);
	});
});
