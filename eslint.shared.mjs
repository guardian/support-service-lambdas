// Shared ESLint override that makes import ordering deterministic across
// working directories.
//
// Workspace packages (@modules/*) are pnpm symlinks, so import/order's
// external-vs-internal classification otherwise depends on the directory ESLint
// runs from (the package dir on the CLI vs the workspace root in editors like
// VS Code / IntelliJ). That flips their position relative to real external
// packages. Pinning @modules/** to the "internal" group makes the order the
// same everywhere.
//
// Spread this after `guardian.configs.recommended` in every eslint.config.mjs
// so package-level configs (which don't inherit the root config) stay in sync.
export const importOrderConfig = {
	rules: {
		'import/order': [
			'error',
			{
				groups: [
					'builtin',
					'external',
					'internal',
					'parent',
					'sibling',
					'index',
					'object',
					'unknown',
				],
				pathGroups: [
					{
						pattern: '@modules/**',
						group: 'internal',
					},
				],
				pathGroupsExcludedImportTypes: [],
				'newlines-between': 'never',
				alphabetize: {
					order: 'asc',
					caseInsensitive: true,
				},
			},
		],
	},
};
