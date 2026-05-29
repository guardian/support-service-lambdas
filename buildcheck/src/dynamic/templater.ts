import * as path from 'path';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { FileTemplate, TemplateIndex } from '../../data/types';
import { toTargetPath } from '../../data/types';

export type TemplateContent = string | Record<string, unknown>;

export interface Template<Definition> {
	targetPath: string;
	value: TemplateContent | ((data: Definition) => TemplateContent);
	templateFilename: string;
}

export interface GeneratedFile {
	/**
	 * relative path to the repo root
	 */
	targetPath: string;
	content: string;
	/**
	 * used for the snapshot test names
	 */
	templateFilename: string;
}

export function applyFileTemplates<Definition>(
	opts: Definition,
	index: TemplateIndex<FileTemplate<Definition>>,
): GeneratedFile[] {
	return index.templates.map((template) => {
		const rawContent =
			typeof template.value === 'function'
				? template.value(opts)
				: template.value;

		const templateFilename = path.join(
			index.templateDir,
			template.relativeName,
		);
		const targetPath = toTargetPath(
			template.relativeName.slice(0, -'.ts'.length),
		);
		return {
			targetPath,
			content: serializeContent(rawContent, targetPath, templateFilename),
			templateFilename,
		} satisfies GeneratedFile;
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
