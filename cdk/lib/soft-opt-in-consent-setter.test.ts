import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SoftOptInConsentSetter } from './soft-opt-in-consent-setter';

describe('The SoftOptInConsentSetter stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const stack = new SoftOptInConsentSetter(app, 'SoftOptInConsentSetter', {
			mobileAccountIdSSMParam: 'mobileAccountId',
			schedule: 'rate(365 days)',
			acquisitionsEventBusArn:
				'arn:aws:events:eu-west-1:865473395570:event-bus/acquisitions-bus-CODE',
			stack: 'membership',
			stage: 'TEST',
		});
		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});
