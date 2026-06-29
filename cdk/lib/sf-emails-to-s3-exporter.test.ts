import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SfEmailsToS3Exporter } from './sf-emails-to-s3-exporter';

describe('The sf-emails-to-s3-exporter stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SfEmailsToS3Exporter(app, 'CODE');
		const prodStack = new SfEmailsToS3Exporter(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
