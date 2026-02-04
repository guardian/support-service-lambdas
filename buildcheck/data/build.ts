import { dep, deprecatedDeps, devDeps } from './dependencies';

/*
This is the main build definition for all handlers.

Each record defines one handler and contains anything unique compared with the
assumed build structure.
 */

export interface HandlerDefinition extends ModuleDefinition {
	stack?: 'support' | 'membership';
	functionNames?: string[];
	entryPoints?: string[];
	extraStages?: Array<'CSBX'>;
}

export interface ModuleDefinition {
	name: string;
	extraScripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	tsConfigExtra?: Record<string, unknown>;
	testTimeoutSeconds?: number;
	jestClearMocks?: boolean;
}

export interface BuildDefinition {
	handlers: HandlerDefinition[];
	modules: ModuleDefinition[];
}

const alarmsHandler: HandlerDefinition = {
	name: 'alarms-handler',
	functionNames: [
		'alarms-handler-',
		'alarms-handler-scheduled-',
		'alarms-handler-summary-',
	],
	entryPoints: ['src/index.ts', 'src/indexScheduled.ts', 'src/indexSummary.ts'],
	dependencies: {
		...dep['@aws-sdk/client-cloudwatch'],
		...dep['@aws-sdk/credential-providers'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...dep.dayjs,
	},
};

const discountApi: HandlerDefinition = {
	name: 'discount-api',
	dependencies: {
		...dep.dayjs,
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const discountExpiryNotifier: HandlerDefinition = {
	name: 'discount-expiry-notifier',
	functionNames: [
		'discount-expiry-notifier-get-expiring-discounts-',
		'discount-expiry-notifier-filter-records-',
		'discount-expiry-notifier-get-sub-status-',
		'discount-expiry-notifier-get-old-payment-amount-',
		'discount-expiry-notifier-get-new-payment-amount-',
		'discount-expiry-notifier-send-email-',
		'discount-expiry-notifier-save-results-',
		'discount-expiry-notifier-alarm-on-failures-',
	],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/client-s3'],
		...dep['@google-cloud/bigquery'],
		...deprecatedDeps['aws-sdk'],
		...dep['dayjs'],
		...dep['google-auth-library'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...deprecatedDeps['@types/aws-sdk'],
	},
};

const generateProductCatalog: HandlerDefinition = {
	name: 'generate-product-catalog',
	devDependencies: {
		...dep['@aws-sdk/client-s3'],
		...devDeps['@types/aws-lambda'],
	},
};

const metricPushApi: HandlerDefinition = {
	name: 'metric-push-api',
	jestClearMocks: true,
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const mobilePurchasesToSupporterProductData: HandlerDefinition = {
	name: 'mobile-purchases-to-supporter-product-data',
	testTimeoutSeconds: 15,
	dependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep.zod,
		...dep.dayjs,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...dep['csv-parse'],
		...devDeps['tsx'],
		...devDeps['tsconfig-paths'],
	},
	extraScripts: {
		runFullSync: 'tsx src/fullSyncCommand.ts',
	},
};

const mparticleApi: HandlerDefinition = {
	name: 'mparticle-api',
	functionNames: ['mparticle-api-http-', 'mparticle-api-baton-'],
	testTimeoutSeconds: 15,
	extraScripts: {
		'check-config': 'tsx runManual/runLoadConfig.ts',
	},
	dependencies: {
		...dep['@peculiar/x509'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@faker-js/faker'],
		...devDeps['@types/aws-lambda'],
		...dep['@aws-sdk/client-s3'],
		...devDeps['tsx'],
	},
};

const negativeInvoicesProcessor: HandlerDefinition = {
	name: 'negative-invoices-processor',
	functionNames: [
		'negative-invoices-processor-get-invoices-',
		'negative-invoices-processor-check-for-active-sub-',
		'negative-invoices-processor-get-payment-methods-',
		'negative-invoices-processor-apply-credit-to-account-balance-',
		'negative-invoices-processor-do-credit-balance-refund-',
		'negative-invoices-processor-save-results-',
		'negative-invoices-processor-detect-failures-',
	],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@google-cloud/bigquery'],
		...deprecatedDeps['aws-sdk'],
		...dep['dayjs'],
		...dep['google-auth-library'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...deprecatedDeps['@types/aws-sdk'],
	},
};

const observerDataExport: HandlerDefinition = {
	name: 'observer-data-export',
	functionNames: ['encrypt-and-upload-observer-data-'],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const pressReaderEntitlements: HandlerDefinition = {
	name: 'press-reader-entitlements',
	dependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/client-ssm'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep.dayjs,
		...dep['fast-xml-parser'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const productSwitchApi: HandlerDefinition = {
	name: 'product-switch-api',
	testTimeoutSeconds: 15,
	dependencies: {
		...dep['@aws-sdk/client-sqs'],
		...dep.dayjs,
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const promotionsLambdas: HandlerDefinition = {
	name: 'promotions-lambdas',
	functionNames: [
		'promotions-lambdas-promo-campaign-sync-',
		'promotions-lambdas-promo-sync-',
		'promotions-lambdas-promo-code-view-',
	],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/util-dynamodb'],
		...dep['@aws-sdk/client-dynamodb'],
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const salesforceDisasterRecovery: HandlerDefinition = {
	name: 'salesforce-disaster-recovery',
	stack: 'membership',
	functionNames: [
		'save-failed-rows-to-s3-',
		'save-salesforce-query-result-to-s3-',
		'update-zuora-accounts-',
	],
	entryPoints: ['src/handlers/*.ts'],
	extraStages: ['CSBX'],
	dependencies: {
		...dep['@aws-sdk/client-s3'],
		...dep['@aws-sdk/client-secrets-manager'],
		...dep['csv-parse'],
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['aws-sdk-client-mock'],
	},
};

const salesforceDisasterRecoveryHealthCheck: HandlerDefinition = {
	name: 'salesforce-disaster-recovery-health-check',
	stack: 'membership',
	functionNames: ['salesforce-disaster-recovery-health-check-'],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/client-sfn'],
		...dep['@aws-sdk/client-sns'],
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const stripeDisputes: HandlerDefinition = {
	name: 'stripe-disputes',
	functionNames: ['stripe-disputes-producer-', 'stripe-disputes-consumer-'],
	entryPoints: ['src/producer.ts', 'src/consumer.ts'],
	dependencies: {
		...deprecatedDeps['aws-sdk'],
		...dep.dayjs,
		...dep.stripe,
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['@types/stripe'],
	},
};

const ticketTailorWebhook: HandlerDefinition = {
	name: 'ticket-tailor-webhook',
	dependencies: {
		...dep['@aws-sdk/client-cloudwatch'],
		...dep['@aws-sdk/client-secrets-manager'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['fetch-mock'],
	},
};

const updateSupporterPlusAmount: HandlerDefinition = {
	name: 'update-supporter-plus-amount',
	dependencies: {
		...dep['@aws-sdk/client-sqs'],
		...dep.dayjs,
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const userBenefits: HandlerDefinition = {
	name: 'user-benefits',
	functionNames: [
		'user-benefits-me-',
		'user-benefits-identity-id-',
		'user-benefits-list-',
	],
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const writeOffUnpaidInvoices: HandlerDefinition = {
	name: 'write-off-unpaid-invoices',
	functionNames: ['get-unpaid-invoices-', 'write-off-invoices-'],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/client-secrets-manager'],
		...dep.dayjs,
	},
};

const zuoraSalesforceLinkRemover: HandlerDefinition = {
	name: 'zuora-salesforce-link-remover',
	stack: 'membership',
	functionNames: [
		'zuora-salesforce-link-remover-get-billing-accounts-',
		'zuora-salesforce-link-remover-update-zuora-billing-account-',
		'zuora-salesforce-link-remover-update-sf-billing-accounts-',
	],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/client-secrets-manager'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['aws-sdk-client-mock'],
	},
};

const srcOnly = {
	lint: "eslint --cache --cache-location /tmp/eslintcache/ 'src/**/*.ts'",
	test: 'jest --group=-integration --passWithNoTests',
};

const moduleAws: ModuleDefinition = {
	name: 'aws',
	dependencies: {
		...dep['@aws-sdk/client-cloudwatch'],
		...dep['@aws-sdk/client-lambda'],
		...dep['@aws-sdk/client-s3'],
		...dep['@aws-sdk/client-sqs'],
		...dep['@aws-sdk/client-ssm'],
		...dep['@aws-sdk/credential-provider-node'],
		...dep['@aws-sdk/lib-storage'],
		...dep.zod,
	},
};

const moduleBigquery: ModuleDefinition = {
	name: 'bigquery',
	dependencies: {
		...dep['@aws-sdk/client-s3'],
		...dep['@google-cloud/bigquery'],
		...deprecatedDeps['aws-sdk'],
		...dep['google-auth-library'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/jest'],
		...devDeps['jest'],
		...devDeps['ts-jest'],
	},
};

const moduleEmail: ModuleDefinition = {
	name: 'email',
	dependencies: {
		...dep['@aws-sdk/client-sqs'],
	},
};

const moduleIdentity: ModuleDefinition = {
	name: 'identity',
	dependencies: {
		...dep['@okta/jwt-verifier'],
		...dep['zod'],
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const moduleInternationalisation: ModuleDefinition = {
	name: 'internationalisation',
	dependencies: {
		...dep['zod'],
	},
	extraScripts: srcOnly,
};

const moduleProductBenefits: ModuleDefinition = {
	name: 'product-benefits',
	dependencies: {
		...dep['zod'],
		...dep['dayjs'],
	},
};

const moduleProductCatalog: ModuleDefinition = {
	name: 'product-catalog',
	devDependencies: {
		...devDeps['tsx'],
		...devDeps['tsconfig-paths'],
		...dep['zod'],
		...devDeps['eslint-plugin-sort-keys-fix'],
		...devDeps['typescript'],
	},
	extraScripts: {
		generateFiles:
			'tsx -r tsconfig-paths/register --project ../../tsconfig.json src/generateSchemaCommand.ts',
		validateSchema:
			'prettier --write src/productCatalogSchema.ts && pnpm run sortSchemaKeys',
		sortSchemaKeys:
			'for i in {1..3}; do eslint --fix src/productCatalogSchema.ts; done',
		validateBillingPeriods:
			'prettier --write src/productBillingPeriods.ts && pnpm run sortBillingPeriodKeys',
		sortBillingPeriodKeys:
			'for i in {1..2}; do eslint --fix src/productBillingPeriods.ts; done',
		validateProductPurchaseSchema:
			'prettier --write src/productPurchaseSchema.ts && pnpm run sortProductPurchaseKeys',
		sortProductPurchaseKeys:
			'for i in {1..2}; do eslint --fix src/productPurchaseSchema.ts; done',
		validateSchemas:
			'pnpm run validateSchema && pnpm run validateBillingPeriods && pnpm run validateProductPurchaseSchema',
		buildGeneratedFiles:
			'tsc --noEmit --skipLibCheck --project tsconfig-for-generated-files.json',
		generateSchema:
			'pnpm run generateFiles && pnpm run validateSchemas && pnpm run buildGeneratedFiles',
		updateSnapshots: 'jest -u --group=-integration',
	},
};

const modulePromotions: ModuleDefinition = {
	name: 'promotions',
	dependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep['zod'],
	},
};

const moduleRouting: ModuleDefinition = {
	name: 'routing',
	dependencies: {
		...dep['zod'],
		...dep['dayjs'],
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
};

const moduleSalesforce: ModuleDefinition = {
	name: 'salesforce',
	dependencies: {
		...dep['zod'],
	},
	devDependencies: {
		...devDeps['@types/jest'],
		...devDeps['jest'],
		...devDeps['ts-jest'],
	},
};

const moduleSecretsManager: ModuleDefinition = {
	name: 'secrets-manager',
	dependencies: {
		...dep['@aws-sdk/client-secrets-manager'],
		...devDeps['aws-sdk-client-mock'],
	},
};

const moduleSupporterProductData: ModuleDefinition = {
	name: 'supporter-product-data',
	devDependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep['dayjs'],
		...dep['zod'],
	},
	extraScripts: {
		test: 'NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" jest --group=-integration',
	},
};

const moduleSyncSupporterProductData: ModuleDefinition = {
	name: 'sync-supporter-product-data',
	dependencies: {
		...dep['zod'],
	},
	devDependencies: {
		...dep['@aws-sdk/client-sqs'],
		...dep['dayjs'],
		...devDeps['tsx'],
	},
	extraScripts: {
		...srcOnly,
		'sync-user': 'tsx ./src/syncUser.ts',
	},
};

const moduleTestUsers: ModuleDefinition = {
	name: 'test-users',
	devDependencies: {
		...dep['dayjs'],
		...devDeps['tsx'],
		...devDeps['tsconfig-paths'],
	},
	extraScripts: {
		...srcOnly,
		createDigitalSubscription: 'tsx ./src/createDigitalSubscription.ts',
		createAnnualContribution: 'tsx ./src/createAnnualContribution.ts',
		createMonthlyContribution: 'tsx ./src/createMonthlyContribution.ts',
		updateMonthlyContributionAmount:
			'tsx ./src/updateMonthlyContributionAmount.ts',
		cancelSubscription: 'tsx ./src/cancel.ts',
		deleteAccount: 'tsx ./src/deleteAccount.ts',
	},
};

const moduleZuora: ModuleDefinition = {
	name: 'zuora',
	dependencies: {
		...dep['@aws-sdk/client-s3'],
		...dep['@aws-sdk/client-secrets-manager'],
		...dep.dayjs,
		...dep.zod,
	},
};

const moduleZuoraCatalog: ModuleDefinition = {
	name: 'zuora-catalog',
	dependencies: {
		...dep['@aws-sdk/client-s3'],
		...dep['zod'],
	},
	extraScripts: {
		'update-catalog-fixtures': 'bash runManual/updateCatalogFixtures.sh',
	},
};

export const build: BuildDefinition = {
	handlers: [
		alarmsHandler,
		discountApi,
		discountExpiryNotifier,
		generateProductCatalog,
		metricPushApi,
		mobilePurchasesToSupporterProductData,
		mparticleApi,
		negativeInvoicesProcessor,
		observerDataExport,
		pressReaderEntitlements,
		productSwitchApi,
		promotionsLambdas,
		salesforceDisasterRecovery,
		salesforceDisasterRecoveryHealthCheck,
		stripeDisputes,
		ticketTailorWebhook,
		updateSupporterPlusAmount,
		userBenefits,
		writeOffUnpaidInvoices,
		zuoraSalesforceLinkRemover,
	],

	modules: [
		moduleAws,
		moduleBigquery,
		moduleEmail,
		moduleIdentity,
		moduleInternationalisation,
		moduleProductBenefits,
		moduleProductCatalog,
		modulePromotions,
		moduleRouting,
		moduleSalesforce,
		moduleSecretsManager,
		moduleSupporterProductData,
		moduleSyncSupporterProductData,
		moduleTestUsers,
		moduleZuora,
		moduleZuoraCatalog,
	],
};
