import { generateSteps } from './generateSteps';
import { GeneratorConfig } from '../data/config';
import { Template } from '../util/templater';

describe('generate function', () => {
	const mockConfig: GeneratorConfig = {
		packages: [
			{
				name: 'package1',
				functionNames: ['package1-function1', 'package1-function2'],
			},
			{ name: 'package2', functionNames: ['package2-function'] },
		],
	};

	const testTemplates: Template[] = [
		{
			name: 'dynamic/template.ts',
			template: (data) => `// This is dynamic content for ${data.name}`,
		},
		{
			name: 'static/text.md',
			template: '# Static markdown content',
		},
		{
			name: 'static/config.json',
			template: {
				version: '1.0.0',
				type: 'config',
			},
		},
		{
			name: 'static/config.yaml',
			template: { name: 'static-yaml', version: 1 },
		},
	];

	it('should generate files for all packages when no package name is specified', () => {
		const result = generateSteps(mockConfig, undefined, testTemplates);

		const expectedGitignoreContent =
			'# Auto generated .gitignore by buildgen ' +
			expect.any(String) +
			'\n/.gitignore\n/dynamic/template.ts\n/static/text.md\n/static/config.json\n/static/config.yaml\n';

		// Compare with exact equality
		expect(result).toEqual([
			{
				relativePath: 'handlers/package1/dynamic/template.ts',
				content: '// This is dynamic content for package1',
			},
			{
				relativePath: 'handlers/package1/static/text.md',
				content: '# Static markdown content',
			},
			{
				relativePath: 'handlers/package1/static/config.json',
				content: JSON.stringify({ version: '1.0.0', type: 'config' }, null, 2),
			},
			{
				relativePath: 'handlers/package1/static/config.yaml',
				content: 'name: static-yaml\nversion: 1\n',
			},
			{
				relativePath: 'handlers/package1/.gitignore',
				content: expect.stringMatching(
					new RegExp(
						expectedGitignoreContent
							.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
							.replace(expect.any(String).toString(), '.*'),
					),
				),
			},
			{
				relativePath: 'handlers/package2/dynamic/template.ts',
				content: '// This is dynamic content for package2',
			},
			{
				relativePath: 'handlers/package2/static/text.md',
				content: '# Static markdown content',
			},
			{
				relativePath: 'handlers/package2/static/config.json',
				content: JSON.stringify({ version: '1.0.0', type: 'config' }, null, 2),
			},
			{
				relativePath: 'handlers/package2/static/config.yaml',
				content: 'name: static-yaml\nversion: 1\n',
			},
			{
				relativePath: 'handlers/package2/.gitignore',
				content: expect.stringMatching(
					new RegExp(
						expectedGitignoreContent
							.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
							.replace(expect.any(String).toString(), '.*'),
					),
				),
			},
		]);
	});

	it('should generate files for a single package when package name is specified', () => {
		const result = generateSteps(mockConfig, 'package1', testTemplates);

		const expectedGitignoreContent =
			'# Auto generated .gitignore by buildgen ' +
			expect.any(String) +
			'\n/.gitignore\n/dynamic/template.ts\n/static/text.md\n/static/config.json\n/static/config.yaml\n';

		expect(result).toEqual([
			{
				relativePath: 'handlers/package1/dynamic/template.ts',
				content: '// This is dynamic content for package1',
			},
			{
				relativePath: 'handlers/package1/static/text.md',
				content: '# Static markdown content',
			},
			{
				relativePath: 'handlers/package1/static/config.json',
				content: JSON.stringify({ version: '1.0.0', type: 'config' }, null, 2),
			},
			{
				relativePath: 'handlers/package1/static/config.yaml',
				content: 'name: static-yaml\nversion: 1\n',
			},
			{
				relativePath: 'handlers/package1/.gitignore',
				content: expect.stringMatching(
					new RegExp(
						expectedGitignoreContent
							.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
							.replace(expect.any(String).toString(), '.*'),
					),
				),
			},
		]);
	});

	it('should throw an error when specified package is not found', () => {
		expect(() => {
			generateSteps(mockConfig, 'non-existent-package', testTemplates);
		}).toThrow('Package non-existent-package not found in configuration');
	});

	it('should correctly map file paths for nested directories', () => {
		const nestedTemplates: Template[] = [
			{
				name: 'nested/dir/file.ts',
				template: 'nested file content',
			},
			{
				name: 'root-level.ts',
				template: 'root content',
			},
		];

		const result = generateSteps(mockConfig, 'package1', nestedTemplates);

		const expectedGitignoreContent =
			'# Auto generated .gitignore by buildgen ' +
			expect.any(String) +
			'\n/.gitignore\n/nested/dir/file.ts\n/root-level.ts\n';

		expect(result).toEqual([
			{
				relativePath: 'handlers/package1/nested/dir/file.ts',
				content: 'nested file content',
			},
			{
				relativePath: 'handlers/package1/root-level.ts',
				content: 'root content',
			},
			{
				relativePath: 'handlers/package1/.gitignore',
				content: expect.stringMatching(
					new RegExp(
						expectedGitignoreContent
							.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
							.replace(expect.any(String).toString(), '.*'),
					),
				),
			},
		]);
	});
});
