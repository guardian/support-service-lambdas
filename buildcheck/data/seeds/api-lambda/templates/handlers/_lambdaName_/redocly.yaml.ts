import type { MaybeTemplateContent } from '@buildcheck/types';
import type { TemplateParams } from '../../../index';

export default ({
	includeOpenApiDoc,
}: TemplateParams): MaybeTemplateContent => {
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
