import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ImovoRewards } from './imovo-rewards';

describe('The Imovo rewards stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ImovoRewards(app, 'CODE');
		const prodStack = new ImovoRewards(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
