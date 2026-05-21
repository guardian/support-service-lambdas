import { toPascalCase, toSentenceCase } from '../../../../snippets/string';
import type { GenerationOptions } from '../../../new-api-lambda';

export default ({ lambdaName }: GenerationOptions): string => {
	const className = toPascalCase(lambdaName);
	const sentenceName = toSentenceCase(lambdaName);
	return `import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ${className} } from './${lambdaName}';

describe('The ${sentenceName} stack', () => {
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
