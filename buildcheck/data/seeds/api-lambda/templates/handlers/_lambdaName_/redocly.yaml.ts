import type { TemplateParams } from '@buildcheck/seeds/api-lambda/index';
import type { MaybeTemplateContent } from '@buildcheck/types';

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
