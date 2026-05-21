import type { GenerationOptions } from '../../../new-api-lambda';

export default ({
	includeOpenApiDoc,
}: GenerationOptions): Record<string, unknown> | null => {
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
