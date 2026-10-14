import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DeliveryRecordsApi } from './delivery-records-api';

describe('The delivery records api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new DeliveryRecordsApi(app, 'CODE');
		const prodStack = new DeliveryRecordsApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
