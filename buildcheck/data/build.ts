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
	functionNames: ['alarms-handler-', 'alarms-handler-scheduled-'],
	entryPoints: ['src/index.ts', 'src/indexScheduled.ts'],
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

const moduleZuora: ModuleDefinition = {
	name: 'zuora',
	dependencies: {
		...dep['@aws-sdk/client-s3'],
		...dep['@aws-sdk/client-secrets-manager'],
		...dep.dayjs,
		...dep.zod,
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
	modules: [moduleZuora],
};
