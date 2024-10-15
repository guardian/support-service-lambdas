import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TicketTailorWebhook } from './ticket-tailor-webhook';

describe('The Ticket tailor webhook stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new TicketTailorWebhook(
			app,
			'ticket-tailor-webhook-CODE',
			{
				stack: 'membership',
				stage: 'CODE',
			},
		);
		const prodStack = new TicketTailorWebhook(
			app,
			'ticket-tailor-webhook-PROD',
			{
				stack: 'membership',
				stage: 'PROD',
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
