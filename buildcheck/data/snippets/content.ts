import { TemplateContent, TemplateInfo } from '../../src/dynamic/template';

/**
 * use in your templates to attach the template file name to the content
 * @param fileContent
 */
export function content(fileContent: TemplateContent): TemplateInfo {
	return { templatePath: getCallerFile(), content: fileContent };
}

function getCallerFile(): string {
	const originalPrepareStackTrace = Error.prepareStackTrace;
	Error.prepareStackTrace = (_, stack) => stack;
	const err = new Error();
	const stack = err.stack as unknown as NodeJS.CallSite[];
	Error.prepareStackTrace = originalPrepareStackTrace;

	if (stack && stack[2] && typeof stack[2].getFileName === 'function') {
		return stack[2].getFileName() ?? 'null_file_name';
	}
	return 'unknown_file_name';
}
