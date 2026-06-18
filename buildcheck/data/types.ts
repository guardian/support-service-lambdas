export type TemplateContent = string | Record<string, unknown>;

/**
 * A single entry in a generated template index (_generated_tsIndex.ts).
 * Represents a file template (never an insertion).
 * Used by managed template groups (handler, module) which never have insertions.
 */
export type FileTemplate<T> = {
	relativeName: string;
	value: TemplateContent | ((data: T) => TemplateContent);
};

export type TemplateIndex<TemplateType> = {
	templates: TemplateType[];
	templateDir: string;
};
