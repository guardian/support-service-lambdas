import type { TemplateContent } from '../../../../../types';
import type { TemplateParams } from '../../../index';

export default ({ includeOpenApiDoc }: TemplateParams): TemplateContent => {
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
