import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { codeProps, prodProps } from '../bin/cdk';
import { NewProductApi } from './new-product-api';

describe('The NewProductApi stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new NewProductApi(app, 'new-product-api-CODE', codeProps);
		const prodStack = new NewProductApi(app, 'new-product-api-PROD', prodProps);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
