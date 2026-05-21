import type { GenerationOptions } from '../../../new-api-lambda';

function toPascalCase(name: string): string {
	return name
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

function toSentenceCase(name: string): string {
	const words = name.split('-');
	return [
		words[0].charAt(0).toUpperCase() + words[0].slice(1),
		...words.slice(1),
	].join(' ');
}

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
