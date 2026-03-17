import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NewsletterAcquisition } from './newsletter-acquisition';

describe('The NewsletterAcquisition stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new NewsletterAcquisition(
			app,
			'newsletter-acquisition-CODE',
			{
				stack: 'support',
				stage: 'CODE',
				identitySnsTopicArn:
					'arn:aws:sns:eu-west-1:942464564246:identity-identity-api-public-CODE-NewsletterAcquisitionTopic',
			},
		);
		const prodStack = new NewsletterAcquisition(
			app,
			'newsletter-acquisition-PROD',
			{
				stack: 'support',
				stage: 'PROD',
				identitySnsTopicArn:
					'arn:aws:sns:eu-west-1:942464564246:identity-identity-api-public-PROD-NewsletterAcquisitionTopic',
			},
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
