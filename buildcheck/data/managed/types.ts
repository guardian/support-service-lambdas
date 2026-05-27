import type { FileTemplate } from '../types';

// this ensures the generated file does not allow "insert" templates, only fully managed files
export type { FileTemplate as TemplateEntry };

export const templatesDirName = __dirname;
