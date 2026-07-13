import guardian from '@guardian/eslint-config';
import sortKeysFix from 'eslint-plugin-sort-keys-fix';
import { importOrderConfig } from '../../eslint.shared.mjs';

export default [
	...guardian.configs.recommended,
	importOrderConfig,
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
