import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CancellationApi } from './cancellation-api';

describe('The Cancellation api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new CancellationApi(app, 'CODE');
		const prodStack = new CancellationApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});

	it.each(['CODE', 'PROD'] as const)(
		'keeps operations protected and documentation public in %s',
		(stage) => {
			const template = Template.fromStack(
				new CancellationApi(new App(), stage),
			);
			template.hasResourceProperties('AWS::ApiGateway::Method', {
				HttpMethod: 'ANY',
				ApiKeyRequired: true,
			});
			expect(
				Object.keys(
					template.findResources('AWS::ApiGateway::Method', {
						Properties: { HttpMethod: 'GET', ApiKeyRequired: false },
					}),
				),
			).toHaveLength(4);
		},
	);
});
