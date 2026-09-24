import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { SendTestDataToMparticle } from './send-test-data-to-mparticle';

describe('The send test data to mParticle stack', () => {
	it('creates one CODE Lambda with exact credential permissions', () => {
		const stack = new SendTestDataToMparticle(new App(), 'CODE');
		const template = Template.fromStack(stack);

		template.resourceCountIs('AWS::Lambda::Function', 1);
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'send-test-data-to-mparticle-CODE',
			Handler: 'index.handler',
			Description:
				'Posts manually supplied test profile data to the mParticle development environment',
		});
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: Match.objectLike({
				Statement: Match.arrayWith([
					Match.objectLike({ Action: 'ssm:GetParameter' }),
				]),
			}),
		});

		const templateJson = JSON.stringify(template.toJSON());
		expect(templateJson).toContain(
			'parameter/CODE/support/mparticle-api/inputPlatform/key',
		);
		expect(templateJson).toContain(
			'parameter/CODE/support/mparticle-api/inputPlatform/secret',
		);
		expect(templateJson).not.toContain(
			'parameter/PROD/support/mparticle-api/inputPlatform',
		);
	});
});
