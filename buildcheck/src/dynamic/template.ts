import type { TemplateValue } from './templater';

export interface Template<T> {
	name: string;
	template: TemplateValue<T>;
}
export type TemplateContent = string | Record<string, unknown>;
export type TemplateInfo = { templatePath: string; content: TemplateContent };
