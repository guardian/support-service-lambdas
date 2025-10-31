import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AddressLookup } from './address-lookup';

describe('The Address lookup stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new AddressLookup(app, 'CODE');
		const prodStack = new AddressLookup(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
