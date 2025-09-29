import * as path from 'path';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { GeneratedFile } from '../steps/generatedFile';

export type TemplateContent = string | Record<string, unknown>;

export interface Template<D> {
	targetPath: string;
	value: TemplateContent | ((data: D) => TemplateContent);
	templateFilename: string;
}

export function applyTemplates<D>(
	pkg: D,
	templates: Array<Template<D>>,
): GeneratedFile[] {
	return templates.map((template) => {
		const rawContent =
			typeof template.value === 'function'
				? template.value(pkg)
				: template.value;

		const content = serializeContent(
			rawContent,
			template.targetPath,
			template.templateFilename,
		);

		return {
			content,
			...template,
		};
	});
}

function serializeContent(
	content: TemplateContent,
	relativePath: string,
	templatePath: string,
): string {
	const extension = path.extname(relativePath);
	const { prefix, write } = contentPostProcessor[extension];
	const actualPrefix = prefix ? prefix(templatePath) : '';
	if (typeof content === 'string') {
		return actualPrefix + content;
	} else {
		if (write === undefined) {
			throw new Error(
				`no object serialiser for file type ${extension} on ${templatePath}`,
			);
		}
		return actualPrefix + write(content);
	}
}
