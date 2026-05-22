import type { TemplateContent } from '../../../../../../src/dynamic/templater';
import type { GenerationOptions } from '../../../index';

export default ({ includeOpenApiDoc }: GenerationOptions): TemplateContent => {
	if (!includeOpenApiDoc) {
		return null;
	}
	return {
		extends: ['recommended'],
		rules: {
			'info-license': 'off',
		},
	};
};
