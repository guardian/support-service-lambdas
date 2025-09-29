import * as path from 'path';
import type { HandlerDefinition } from '../../data/build';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { GeneratedFile } from '../steps/generatedFile';
import { handlerTemplates } from './generated/generatedMappings';

export type TemplateContent = string | Record<string, unknown>;

export interface Template {
	targetPath: string;
	value: TemplateContent | ((data: HandlerDefinition) => TemplateContent);
	templateFilename: string;
}

export function applyTemplates(pkg: HandlerDefinition): GeneratedFile[] {
	return handlerTemplates.map((template) => {
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
