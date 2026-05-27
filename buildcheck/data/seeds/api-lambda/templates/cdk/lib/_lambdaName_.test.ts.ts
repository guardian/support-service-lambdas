import { toPascalCase, toSentenceCase } from '../../../../../snippets/string';
import type { MaybeTemplateContent } from '../../../../../types';
import type { TemplateParams } from '../../../index';

export default ({ lambdaName }: TemplateParams): MaybeTemplateContent => {
	const className = toPascalCase(lambdaName);
	return `import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ${className} } from './${lambdaName}';

describe('The ${toSentenceCase(lambdaName)} stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ${className}(app, 'CODE');
		const prodStack = new ${className}(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
`;
};
