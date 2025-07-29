import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DeliveryRecordsApi } from './delivery-records-api';

describe('DeliveryRecordsApi stack', () => {
	it('creates the expected resources', () => {
		const app = new App();
		const stack = new DeliveryRecordsApi(app, 'DeliveryRecordsApi', {
			stack: 'support',
			stage: 'TEST',
		});

		const template = Template.fromStack(stack);

		// Check that lambda function is created
		template.hasResourceProperties('AWS::Lambda::Function', {
			Handler: 'com.gu.delivery_records_api.Handler::handle',
			Runtime: 'java21',
			MemorySize: 1536,
			Timeout: 300,
			Architectures: ['arm64'],
		});

		// Check that API Gateway is created
		template.hasResourceProperties('AWS::ApiGateway::RestApi', {
			Name: 'delivery-records-api-CODE',
			Description: 'api for accessing delivery records in salesforce',
		});

		// Check that API Gateway method has API key requirement
		template.hasResourceProperties('AWS::ApiGateway::Method', {
			ApiKeyRequired: true,
		});

		// Check that Usage Plan is created
		template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
			UsagePlanName: 'delivery-records-api',
		});

		// Check that API Key is created
		template.hasResourceProperties('AWS::ApiGateway::ApiKey', {
			Name: 'delivery-records-api-key-TEST',
			Description: 'Used by manage-frontend',
		});

		// Check that Usage Plan Key is created
		template.hasResourceProperties('AWS::ApiGateway::UsagePlanKey', {
			KeyType: 'API_KEY',
		});

		// Check that custom domain name is created
		template.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'delivery-records-api-code.support.guardianapis.com',
			EndpointConfiguration: {
				Types: ['REGIONAL'],
			},
		});

		// Check that base path mapping is created
		template.hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
			Stage: 'TEST',
		});

		// Check that DNS record is created
		template.hasResourceProperties('AWS::Route53::RecordSet', {
			HostedZoneName: 'support.guardianapis.com.',
			Name: 'delivery-records-api-code.support.guardianapis.com',
			Type: 'CNAME',
			TTL: '120',
		});

		// Check that IAM role has correct S3 permissions
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: Match.arrayWith([
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: 'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/TEST/*',
					},
				]),
				Version: '2012-10-17',
			},
		});
	});

	it('creates alarms only for PROD stage', () => {
		const app = new App();
		const codeStack = new DeliveryRecordsApi(
			app,
			'DeliveryRecordsApiCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new DeliveryRecordsApi(
			app,
			'DeliveryRecordsApiProd',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should not have alarms
		codeTemplate.resourceCountIs('AWS::CloudWatch::Alarm', 0);

		// PROD should have alarms
		prodTemplate.resourcePropertiesCountIs('AWS::CloudWatch::Alarm', {}, 1);

		// Verify the alarm configuration for PROD
		prodTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
			AlarmName: '5XX rate from delivery-records-api-PROD',
			AlarmDescription:
				'Delivery records API exceeded the allowed 5XX error rate',
			ComparisonOperator: 'GreaterThanThreshold',
			Threshold: 2,
			EvaluationPeriods: 1,
			TreatMissingData: 'notBreaching',
		});
	});

	it('uses correct domain names and API names for different stages', () => {
		const app = new App();
		const codeStack = new DeliveryRecordsApi(
			app,
			'DeliveryRecordsApiCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new DeliveryRecordsApi(
			app,
			'DeliveryRecordsApiProd',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should use CODE domain and API name
		codeTemplate.hasResourceProperties('AWS::ApiGateway::RestApi', {
			Name: 'delivery-records-api-CODE',
		});

		codeTemplate.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'delivery-records-api-code.support.guardianapis.com',
		});

		codeTemplate.hasResourceProperties('AWS::Route53::RecordSet', {
			Name: 'delivery-records-api-code.support.guardianapis.com',
		});

		// PROD should use PROD domain and API name
		prodTemplate.hasResourceProperties('AWS::ApiGateway::RestApi', {
			Name: 'delivery-records-api-PROD',
		});

		prodTemplate.hasResourceProperties('AWS::ApiGateway::DomainName', {
			DomainName: 'delivery-records-api.support.guardianapis.com',
		});

		prodTemplate.hasResourceProperties('AWS::Route53::RecordSet', {
			Name: 'delivery-records-api.support.guardianapis.com',
		});
	});

	it('uses correct S3 bucket URNs for different stages', () => {
		const app = new App();
		const codeStack = new DeliveryRecordsApi(
			app,
			'DeliveryRecordsApiCode',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);

		const prodStack = new DeliveryRecordsApi(
			app,
			'DeliveryRecordsApiProd',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		const codeTemplate = Template.fromStack(codeStack);
		const prodTemplate = Template.fromStack(prodStack);

		// CODE should use CODE stage in S3 bucket path
		codeTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: Match.arrayWith([
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: 'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/CODE/*',
					},
				]),
				Version: '2012-10-17',
			},
		});

		// PROD should use PROD stage in S3 bucket path
		prodTemplate.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: Match.arrayWith([
					{
						Effect: 'Allow',
						Action: 's3:GetObject',
						Resource: 'arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/PROD/*',
					},
				]),
				Version: '2012-10-17',
			},
		});
	});
});
