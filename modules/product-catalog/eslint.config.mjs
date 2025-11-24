import guardian from '@guardian/eslint-config';
import sortKeysFix from 'eslint-plugin-sort-keys-fix';

export default [
	...guardian.configs.recommended,
	{
		files: [
			'src/productCatalogSchema.ts',
			'src/productBillingPeriods.ts',
			'src/productPurchaseSchema.ts',
		],
		plugins: {
			'sort-keys-fix': sortKeysFix,
		},
		rules: {
			'sort-keys-fix/sort-keys-fix': 'warn',
		},
	},
];
