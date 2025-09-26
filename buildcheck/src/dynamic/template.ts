import type { TemplateValue } from './templater';

export interface Template {
	name: string;
	template: TemplateValue;
}
export type TemplateContent = string | Record<string, unknown>;
export type TemplateInfo = { templatePath: string; content: TemplateContent };
