import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MParticleApi } from './mparticle-api';

describe('The mParticle API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new MParticleApi(app, 'CODE');
		const prodStack = new MParticleApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
