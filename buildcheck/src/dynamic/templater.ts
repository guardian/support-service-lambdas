import * as path from 'path';
import type { HandlerDefinition } from '../../data/build';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { GeneratedFile } from '../steps/generatedFile';
import { handlerTemplates } from './generated/generatedMappings';

export interface Template {
	name: string;
	template: TemplateValue;
	templatePath: string;
}
export type TemplateContent = string | Record<string, unknown>;

export type TemplateFunction = (data: HandlerDefinition) => TemplateContent;
export type TemplateValue = TemplateContent | TemplateFunction;

export function applyTemplates(pkg: HandlerDefinition): GeneratedFile[] {
	return handlerTemplates.map((template) => {
		const rawContent =
			typeof template.template === 'function'
				? template.template(pkg)
				: template.template;

		const content = serializeContent(
			rawContent,
			template.name,
			template.templatePath,
		);

		return {
			relativePath: template.name,
			content,
			templatePath: template.templatePath,
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
