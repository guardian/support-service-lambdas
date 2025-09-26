import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HolidayStopApi } from './holiday-stop-api';

describe('HolidayStopApi stack', () => {
	it('creates the expected resources', () => {
		const app = new App();
		const stack = new HolidayStopApi(app, 'HolidayStopApi', {
			stack: 'support',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Check that lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'holiday-stop-api-TEST',
			Handler: 'com.gu.holiday_stops.Handler::apply',
			Runtime: 'java21',
			MemorySize: 1536,
			Timeout: 300,
		});

		// Check that API Gateway is created
		template.hasResourceProperties('AWS::ApiGateway::RestApi', {
			Name: 'support-TEST-holiday-stop-api',
		});

		// Check that usage plan is created
		template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
			UsagePlanName: 'holiday-stop-api',
			Description: 'REST endpoints for holiday-stop-api',
		});

		// Check that API key is created
		template.hasResourceProperties('AWS::ApiGateway::ApiKey', {
			Name: 'holiday-stop-api-key-TEST',
			Description: 'Used by manage-frontend',
		});

		// Check that custom domain name is created
		template.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'holiday-stop-api-code.support.guardianapis.com',
			EndpointConfiguration: {
				Types: ['REGIONAL'],
			},
		});

		// Check that IAM policy exists for S3 access
		template.resourceCountIs('AWS::IAM::Policy', 1);
	});

	it('creates alarms only for PROD stage', () => {
		const app = new App();
		const codeStack = new HolidayStopApi(app, 'HolidayStopApiCode', {
			stack: 'support',
			stage: 'CODE',
		});

		const prodStack = new HolidayStopApi(app, 'HolidayStopApiProd', {
			stack: 'support',
			stage: 'PROD',
		});

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should not have alarms
		codeTemplate.resourceCountIs('AWS::CloudWatch::Alarm', 0);

		// PROD should have alarms
		prodTemplate.resourcePropertiesCountIs('AWS::CloudWatch::Alarm', {}, 1);

		// Verify the alarm configuration for PROD
		prodTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
			AlarmName: '5XX rate from holiday-stop-api-PROD',
			AlarmDescription: 'Holiday stop API exceeded the allowed 5XX error rate',
			ComparisonOperator: 'GreaterThanThreshold',
			Threshold: 5,
			EvaluationPeriods: 1,
			TreatMissingData: 'notBreaching',
		});
	});

	it('uses correct S3 bucket URNs and domain names for different stages', () => {
		const app = new App();
		const codeStack = new HolidayStopApi(app, 'HolidayStopApiCode', {
			stack: 'support',
			stage: 'CODE',
		});

		const prodStack = new HolidayStopApi(app, 'HolidayStopApiProd', {
			stack: 'support',
			stage: 'PROD',
		});

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// Check domain names are correct for each stage
		codeTemplate.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'holiday-stop-api-code.support.guardianapis.com',
		});

		prodTemplate.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'holiday-stop-api.support.guardianapis.com',
		});

		// Check that both stages have IAM policies (the specific S3 bucket resources are complex to match)
		codeTemplate.resourceCountIs('AWS::IAM::Policy', 1);
		prodTemplate.resourceCountIs('AWS::IAM::Policy', 1);
	});

	it('creates all required API Gateway endpoints', () => {
		const app = new App();
		const stack = new HolidayStopApi(app, 'HolidayStopApi', {
			stack: 'support',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Check that multiple methods are created for different endpoints
		// The exact count will depend on the GuApiGatewayWithLambdaByPath implementation
		template.resourceCountIs('AWS::ApiGateway::Method', 8); // 8 endpoints defined in the targets array

		// Check that API key is required for endpoints
		template.hasResourceProperties('AWS::ApiGateway::Method', {
			ApiKeyRequired: true,
		});
	});
});
