import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MparticleAcquisitionsPublisher } from './mparticle-acquisitions-publisher';

describe('The mParticle acquisitions publisher stack', () => {
	it('creates an isolated EventBridge, SQS, and Lambda path', () => {
		const app = new App();
		const stack = new MparticleAcquisitionsPublisher(app, 'PROD');
		const template = Template.fromStack(stack);

		template.resourceCountIs('AWS::SQS::Queue', 3);
		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'mparticle-acquisitions-publisher-queue-PROD',
		});
		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'mparticle-acquisitions-publisher-dlq-PROD',
		});
		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'mparticle-acquisitions-publisher-eventbridge-dlq-PROD',
		});
		template.hasResourceProperties('AWS::Events::Rule', {
			EventBusName: 'acquisitions-bus-PROD',
			EventPattern: {
				'detail-type': ['AcquisitionsEvent'],
			},
		});
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'mparticle-acquisitions-publisher-PROD',
			Handler: 'index.handler',
		});
		template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
			BatchSize: 10,
			FunctionResponseTypes: ['ReportBatchItemFailures'],
		});
		template.hasResourceProperties('AWS::CloudWatch::Alarm', {
			AlarmName:
				'PROD mparticle-acquisitions-publisher publisher DLQ has messages',
		});
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: Match.objectLike({
				Statement: Match.arrayWith([
					Match.objectLike({ Action: 'ssm:GetParametersByPath' }),
				]),
			}),
		});
		const templateJson = JSON.stringify(template.toJSON());
		expect(templateJson).toContain(
			'parameter/PROD/support/mparticle-api/inputPlatform/key',
		);
		expect(templateJson).toContain(
			'parameter/PROD/support/mparticle-api/inputPlatform/secret',
		);

		expect(template.toJSON()).toMatchSnapshot();
	});

	it('keeps CODE and PROD resource names independent', () => {
		const codeStack = new MparticleAcquisitionsPublisher(new App(), 'CODE');
		const prodStack = new MparticleAcquisitionsPublisher(new App(), 'PROD');

		for (const [stack, stage] of [
			[codeStack, 'CODE'],
			[prodStack, 'PROD'],
		] as const) {
			Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
				QueueName: `mparticle-acquisitions-publisher-queue-${stage}`,
			});
			Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
				FunctionName: `mparticle-acquisitions-publisher-${stage}`,
			});
		}
	});
});
