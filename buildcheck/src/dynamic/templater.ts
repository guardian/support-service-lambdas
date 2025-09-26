import * as path from 'path';
import type { HandlerDefinition } from '../../data/build';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { GeneratedFile } from '../steps/generatedFile';
import { handlerTemplates } from './generated/generatedMappings';
import type { TemplateInfo } from './template';

export type TemplateFunction = (data: HandlerDefinition) => TemplateInfo;
export type TemplateValue = TemplateInfo | TemplateFunction;

export function applyTemplates(pkg: HandlerDefinition): GeneratedFile[] {
	return handlerTemplates.map((template) => {
		const rawContent =
			typeof template.template === 'function'
				? template.template(pkg)
				: template.template;

		const content = serializeContent(
			rawContent,
			template.name,
			rawContent.templatePath,
		);

		return {
			relativePath: template.name,
			content,
			templatePath: rawContent.templatePath,
		};
	});
}

function serializeContent(
	content: TemplateInfo,
	relativePath: string,
	templatePath: string,
): string {
	const extension = path.extname(relativePath);
	const { prefix, write } = contentPostProcessor[extension];
	const actualPrefix = prefix ? prefix(templatePath) : '';
	if (typeof content.content === 'string') {
		return actualPrefix + content.content;
	} else {
		if (write === undefined) {
			throw new Error(
				`no object serialiser for file type ${extension} on ${templatePath}`,
			);
		}
		return actualPrefix + write(content.content);
	}
}
