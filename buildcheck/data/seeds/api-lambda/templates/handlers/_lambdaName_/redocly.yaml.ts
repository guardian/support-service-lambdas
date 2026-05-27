import type { MaybeTemplateContent } from '../../../../../types';
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
