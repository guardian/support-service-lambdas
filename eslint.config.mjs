import guardian from '@guardian/eslint-config';

export default [
	...guardian.configs.recommended,
	...guardian.configs.jest,
	...guardian.configs.react,
	...guardian.configs.storybook,
];
