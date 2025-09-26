import * as path from 'path';
import type { HandlerDefinition, RootDefinition } from '../../data/build';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { GeneratedFile } from '../steps/generatedFile';
import { handlerTemplates, rootTemplates } from './generated/generatedMappings';
import type { Template, TemplateInfo } from './template';

export type TemplateFunction<T> = (data: T) => TemplateInfo;
export type TemplateValue<T> = TemplateInfo | TemplateFunction<T>;

function applyTemplates<D>(
	pkg: D,
	templates: Array<Template<D>>,
): GeneratedFile[] {
	return templates.map((template) => {
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

export function applyHandlerTemplates(pkg: HandlerDefinition): GeneratedFile[] {
	return applyTemplates(pkg, handlerTemplates);
}

export function applyRootTemplates(pkg: RootDefinition): GeneratedFile[] {
	return applyTemplates(pkg, rootTemplates);
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
