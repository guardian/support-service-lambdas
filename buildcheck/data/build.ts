import { dep, deprecatedDeps, devDeps } from './dependencies';
import { openApiScripts, srcOnly } from './scripts';

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
	moduleDependencies: ModuleDefinition[];
}

export interface BuildDefinition {
	handlers: HandlerDefinition[];
	modules: ModuleDefinition[];
}

const moduleLogger: ModuleDefinition = {
	name: 'logger',
	devDependencies: {
		...devDeps['@smithy/types'],
	},
	moduleDependencies: [],
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
	moduleDependencies: [moduleLogger],
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
	moduleDependencies: [moduleAws, moduleLogger],
};

const moduleInternationalisation: ModuleDefinition = {
	name: 'internationalisation',
	dependencies: {
		...dep['zod'],
	},
	extraScripts: srcOnly,
	moduleDependencies: [],
};

const moduleProductCatalog: ModuleDefinition = {
	name: 'product-catalog',
	devDependencies: {
		...devDeps['tsx'],
		...devDeps['tsconfig-paths'],
		...dep['zod'],
		...devDeps['eslint-plugin-sort-keys-fix'],
	},
	extraScripts: {
		generateFiles: 'tsx src/generateSchemaCommand.ts',
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
		buildGeneratedFiles: 'tsc --noEmit --skipLibCheck',
		generateSchema:
			'pnpm run generateFiles && pnpm run validateSchemas && pnpm run buildGeneratedFiles',
		updateSnapshots: 'jest -u --group=-integration',
	},
	moduleDependencies: [moduleLogger, moduleZuoraCatalog],
};

const modulePromotions: ModuleDefinition = {
	name: 'promotions',
	dependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep['zod'],
	},
	moduleDependencies: [
		moduleAws,
		moduleInternationalisation,
		moduleLogger,
		moduleProductCatalog,
	],
};

const moduleZuora: ModuleDefinition = {
	name: 'zuora',
	dependencies: {
		...dep['@aws-sdk/client-s3'],
		...dep['@aws-sdk/client-secrets-manager'],
		...dep.dayjs,
		...dep.zod,
	},
	moduleDependencies: [
		moduleAws,
		moduleInternationalisation,
		moduleLogger,
		moduleProductCatalog,
		modulePromotions,
		moduleZuoraCatalog,
	],
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
	moduleDependencies: [moduleAws, moduleLogger, moduleZuora],
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
	moduleDependencies: [],
};

const moduleEmail: ModuleDefinition = {
	name: 'email',
	dependencies: {
		...dep['@aws-sdk/client-sqs'],
		...dep['dayjs'],
	},
	moduleDependencies: [
		moduleAws,
		moduleInternationalisation,
		moduleProductCatalog,
	],
};

const moduleSecretsManager: ModuleDefinition = {
	name: 'secrets-manager',
	dependencies: {
		...dep['@aws-sdk/client-secrets-manager'],
		...devDeps['aws-sdk-client-mock'],
	},
	moduleDependencies: [moduleAws],
};

const moduleGuardianSubscription: ModuleDefinition = {
	name: 'guardian-subscription',
	dependencies: { ...dep['dayjs'] },
	devDependencies: {
		...dep['@aws-sdk/client-cloudwatch-logs'],
		...dep['@aws-sdk/credential-providers'],
	},
	moduleDependencies: [
		moduleLogger,
		moduleProductCatalog,
		moduleZuora,
		moduleZuoraCatalog,
	],
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
	moduleDependencies: [moduleAws, moduleZuora],
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
	moduleDependencies: [moduleAws, moduleLogger, moduleZuora],
};

const moduleMultipleAccount: ModuleDefinition = {
	name: 'multiple-account',
	devDependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep['dayjs'],
		...dep['zod'],
	},
	moduleDependencies: [moduleAws, moduleLogger, moduleSupporterProductData],
};

const moduleProductBenefits: ModuleDefinition = {
	name: 'product-benefits',
	dependencies: {
		...dep['zod'],
		...dep['dayjs'],
	},
	moduleDependencies: [
		moduleIdentity,
		moduleProductCatalog,
		moduleSupporterProductData,
	],
};

const moduleSalesforce: ModuleDefinition = {
	name: 'salesforce',
	dependencies: {
		...dep['zod'],
	},
	moduleDependencies: [moduleSecretsManager, moduleZuora],
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
	moduleDependencies: [moduleAws, moduleProductCatalog, moduleZuora],
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
	moduleDependencies: [moduleProductCatalog, moduleZuora],
};

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
	moduleDependencies: [moduleAws, moduleRouting, moduleZuora],
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
	moduleDependencies: [
		moduleEmail,
		moduleRouting,
		moduleZuora,
		moduleZuoraCatalog,
	],
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
	moduleDependencies: [moduleAws, moduleBigquery, moduleEmail, moduleZuora],
};

const generateProductCatalog: HandlerDefinition = {
	name: 'generate-product-catalog',
	devDependencies: {
		...dep['@aws-sdk/client-s3'],
		...devDeps['@types/aws-lambda'],
	},
	moduleDependencies: [moduleAws, moduleProductCatalog, moduleZuoraCatalog],
};

const imovoVoucherApi: HandlerDefinition = {
	name: 'imovo-voucher-api',
	dependencies: {
		...dep['@aws-sdk/client-secrets-manager'],
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['tsx'],
	},
	extraScripts: {
		'run-local': 'tsx src/runLocal.ts',
	},
	moduleDependencies: [moduleEmail],
};

const metricPushApi: HandlerDefinition = {
	name: 'metric-push-api',
	jestClearMocks: true,
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
	moduleDependencies: [moduleAws, moduleRouting],
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
	moduleDependencies: [
		moduleAws,
		moduleProductBenefits,
		moduleSupporterProductData,
	],
};

const mparticleApi: HandlerDefinition = {
	name: 'mparticle-api',
	functionNames: [
		'mparticle-api-http-',
		'mparticle-api-baton-',
		'mparticle-api-mma-user-deletion-',
	],
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
	moduleDependencies: [moduleAws, moduleRouting],
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
	moduleDependencies: [moduleAws, moduleBigquery, moduleZuora],
};

const observerDataExport: HandlerDefinition = {
	name: 'observer-data-export',
	functionNames: ['encrypt-and-upload-observer-data-'],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...devDeps['@types/aws-lambda'],
	},
	moduleDependencies: [moduleAws],
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
	moduleDependencies: [
		moduleAws,
		moduleIdentity,
		moduleProductBenefits,
		moduleProductCatalog,
		moduleRouting,
		moduleSupporterProductData,
		moduleZuora,
	],
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
	moduleDependencies: [
		moduleAws,
		moduleEmail,
		moduleGuardianSubscription,
		moduleInternationalisation,
		moduleProductCatalog,
		moduleRouting,
		moduleSupporterProductData,
		moduleZuora,
		moduleZuoraCatalog,
	],
};

const promotionsLambdas: HandlerDefinition = {
	name: 'promotions-lambdas',
	functionNames: [
		'promotions-lambdas-promo-code-view-',
		'promotions-lambdas-salesforce-export-',
	],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/util-dynamodb'],
		...dep['@aws-sdk/client-dynamodb'],
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
	moduleDependencies: [
		moduleAws,
		modulePromotions,
		moduleSalesforce,
		moduleZuora,
	],
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
	moduleDependencies: [moduleZuora],
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
	moduleDependencies: [],
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
	moduleDependencies: [
		moduleEmail,
		moduleRouting,
		moduleSalesforce,
		moduleSecretsManager,
		moduleZuora,
	],
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
	moduleDependencies: [moduleAws, moduleSecretsManager],
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
	moduleDependencies: [
		moduleEmail,
		moduleInternationalisation,
		moduleProductCatalog,
		moduleRouting,
		moduleZuora,
	],
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
	moduleDependencies: [
		moduleIdentity,
		moduleProductBenefits,
		moduleProductCatalog,
		moduleRouting,
	],
};

const writeOffUnpaidInvoices: HandlerDefinition = {
	name: 'write-off-unpaid-invoices',
	functionNames: ['get-unpaid-invoices-', 'write-off-invoices-'],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/client-secrets-manager'],
		...dep.dayjs,
	},
	moduleDependencies: [moduleAws, moduleBigquery, moduleZuora],
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
	moduleDependencies: [moduleSalesforce, moduleZuora],
};

const newSubscriptionApi: HandlerDefinition = {
	name: 'new-subscription-api',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
	moduleDependencies: [
		moduleInternationalisation,
		moduleProductCatalog,
		modulePromotions,
		moduleRouting,
		moduleZuora,
	],
};

const newsletterAcquisition: HandlerDefinition = {
	name: 'newsletter-acquisition',
	dependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
	moduleDependencies: [],
};

const multipleAccountApi: HandlerDefinition = {
	name: 'multiple-account-api',
	dependencies: {
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep.nanoid,
		...dep.zod,
		...dep.dayjs,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['@redocly/cli'],
	},
	extraScripts: {
		...openApiScripts,
		package: `pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr multiple-account-api.zip ./*.js.map ./*.js`,
	},
	moduleDependencies: [
		moduleMultipleAccount,
		moduleRouting,
		moduleLogger,
		moduleIdentity,
		moduleProductBenefits,
		moduleGuardianSubscription,
	],
};

const observerBenefitsApi: HandlerDefinition = {
	name: 'observer-benefits-api',
	dependencies: {
		...dep.zod,
		...dep.dayjs,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['@redocly/cli'],
	},
	extraScripts: {
		'it-test':
			'NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" jest --group=integration',
		'openapi:lint': 'redocly lint openapi.yaml',
		'openapi:preview':
			'redocly build-docs openapi.yaml --output target/docs/index.html && open target/docs/index.html',
		package: `pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr observer-benefits-api.zip ./*.js.map ./*.js`,
	},
	moduleDependencies: [
		moduleGuardianSubscription,
		moduleProductCatalog,
		moduleRouting,
		moduleZuora,
		moduleZuoraCatalog,
	],
};

const contributionsOnlyCountriesApi: HandlerDefinition = {
	name: 'contributions-only-countries-api',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
	},
	moduleDependencies: [moduleRouting, moduleLogger, moduleInternationalisation],
};

const userSubscriptionsApi: HandlerDefinition = {
	name: 'user-subscriptions-api',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['@redocly/cli'],
		...devDeps['tsx'],
	},
	extraScripts: {
		...openApiScripts,
		package: `pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr user-subscriptions-api.zip ./*.js.map ./*.js`,
	},
	moduleDependencies: [moduleRouting, moduleZuora],
};

const salesTaxApi: HandlerDefinition = {
	name: 'sales-tax-api',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],

		...devDeps['@redocly/cli'],
	},
	moduleDependencies: [
		moduleLogger,
		moduleRouting,
		moduleProductCatalog,
		moduleInternationalisation,
	],
	extraScripts: {
		...openApiScripts,
		package: `pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr sales-tax-api.zip ./*.js.map ./*.js`,
	},
};

const supporterProductDataLambdas: HandlerDefinition = {
	name: 'supporter-product-data-lambdas',
	functionNames: [
		'supporterProductData-QueryZuora-',
		'supporterProductData-FetchResults-',
		'supporterProductData-AddToQueue-',
		'supporterProductData-ProcessItem-',
	],
	entryPoints: ['src/handlers/*.ts'],
	dependencies: {
		...dep['@aws-sdk/client-cloudwatch'],
		...dep['@aws-sdk/client-dynamodb'],
		...dep['@aws-sdk/util-dynamodb'],
		...dep['@aws-sdk/client-s3'],
		...dep['@aws-sdk/client-sqs'],
		...dep['@aws-sdk/client-ssm'],
		...dep['@aws-sdk/client-secrets-manager'],
		...dep['@aws-sdk/credential-provider-node'],
		...dep['@aws-sdk/lib-storage'],
		...dep.dayjs,
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['tsx'],
	},
	extraScripts: {
		'download-query-results': 'tsx src/downloadQueryResultsCommand.ts',
	},
	moduleDependencies: [
		moduleLogger,
		moduleMultipleAccount,
		moduleZuora,
		moduleInternationalisation,
		moduleSupporterProductData,
	],
};

const brazeAcquisitionEventsSync: HandlerDefinition = {
	name: 'braze-acquisition-events-sync',
	dependencies: {
		...dep.zod,
	},
	devDependencies: {
		...devDeps['@types/aws-lambda'],
		...devDeps['@redocly/cli'],
	},
	extraScripts: {
		...openApiScripts,
		package: `pnpm type-check && pnpm lint && pnpm openapi:lint && pnpm check-formatting && pnpm test && pnpm build && cd target && zip -qr braze-acquisition-events-sync.zip ./*.js.map ./*.js`,
	},
	moduleDependencies: [moduleLogger, moduleIdentity],
};
// MARKER new-lambda: buildcheck-const

export const build: BuildDefinition = {
	handlers: [
		alarmsHandler,
		discountApi,
		discountExpiryNotifier,
		generateProductCatalog,
		imovoVoucherApi,
		metricPushApi,
		mobilePurchasesToSupporterProductData,
		mparticleApi,
		negativeInvoicesProcessor,
		newsletterAcquisition,
		observerDataExport,
		pressReaderEntitlements,
		productSwitchApi,
		promotionsLambdas,
		salesforceDisasterRecovery,
		salesforceDisasterRecoveryHealthCheck,
		stripeDisputes,
		ticketTailorWebhook,
		updateSupporterPlusAmount,
		newSubscriptionApi,
		userBenefits,
		writeOffUnpaidInvoices,
		zuoraSalesforceLinkRemover,
		multipleAccountApi,
		observerBenefitsApi,
		contributionsOnlyCountriesApi,
		userSubscriptionsApi,
		salesTaxApi,
		supporterProductDataLambdas,
		brazeAcquisitionEventsSync,
		// MARKER new-lambda: buildcheck-reference
	],

	modules: [
		moduleAws,
		moduleBigquery,
		moduleEmail,
		moduleGuardianSubscription,
		moduleIdentity,
		moduleInternationalisation,
		moduleLogger,
		moduleMultipleAccount,
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
