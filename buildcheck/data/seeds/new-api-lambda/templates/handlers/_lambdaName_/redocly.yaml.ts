import type { GenerationOptions } from '../../../index';

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
