import type { HandlerDefinition } from '../../build';

export default (pkg: HandlerDefinition) => {
	return {
		extends: '../../tsconfig.json',
		...pkg.tsConfigExtra,
	};
};
