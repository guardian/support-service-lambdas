import * as path from 'path';
import * as yaml from 'js-yaml';
import type { HandlerDefinition } from '../../data/build';
import type { GeneratedFile } from '../steps/generatedFile';

export type TemplateContent = string | Record<string, unknown>;
export type TemplateFunction = (data: HandlerDefinition) => TemplateContent;
export type TemplateValue = TemplateContent | TemplateFunction;

export interface Template {
	name: string;
	template: TemplateValue;
}

export function applyTemplates(
	pkg: HandlerDefinition,
	templates: Template[],
): GeneratedFile[] {
	return templates.map((template) => {
		const rawContent =
			typeof template.template === 'function'
				? template.template(pkg)
				: template.template;

		const content = serializeContent(rawContent, template.name);

		return {
			relativePath: template.name,
			content,
			templatePath: 'buildcheck/data/handlerTemplate/' + template.name + '.ts',
		};
	});
}

function serializeContent(
	content: string | object,
	relativePath: string,
): string {
	if (typeof content === 'string') {
		return content;
	}

	const extension = path.extname(relativePath);
	if (extension === '.yaml') {
		return yaml.dump(content, { indent: 2 });
	}

	if (extension === '.json') {
		return JSON.stringify(content, null, 2);
	}

	throw new Error(
		`Cannot serialize object content for file type: ${extension}. Only .json, .yaml, and .yml files support object content.`,
	);
}
