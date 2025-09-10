import { HandlerConfig } from '../data/build';
import * as path from 'path';
import * as yaml from 'js-yaml';

export type TemplateContent = string | Record<string, any>;
export type TemplateFunction = (data: HandlerConfig) => TemplateContent;
export type TemplateValue = TemplateContent | TemplateFunction;

export interface Template {
	name: string;
	template: TemplateValue;
}

export function applyTemplates(pkg: HandlerConfig, templates: Template[]) {
	return templates.map((template) => {
		const rawContent =
			typeof template.template === 'function'
				? template.template(pkg)
				: template.template;

		const content = serializeContent(rawContent, template.name);

		return {
			relativePath: template.name,
			content,
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
