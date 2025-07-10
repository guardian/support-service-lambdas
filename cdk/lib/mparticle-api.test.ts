import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MParticleApi } from './mparticle-api';

describe('The mParticle API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new MParticleApi(app, 'mparticle-api-CODE', {
			stack: 'support',
			stage: 'CODE',
			batonAccountIdSSMParam: 'batonAccountId',
		});
		const prodStack = new MParticleApi(app, 'mparticle-api-PROD', {
			stack: 'support',
			stage: 'PROD',
			batonAccountIdSSMParam: 'batonAccountId',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
