import { getIfDefined } from '@modules/nullAndUndefined';

type Team = 'VALUE' | 'GROWTH' | 'PORTFOLIO' | 'PLATFORM' | 'SRE';

const sharedMobilePurchasesApps = [
	'mobile-purchases-apple-pubsub',
	'mobile-purchases-apple-subscription-status',
	'mobile-purchases-apple-update-subscriptions',
	'mobile-purchases-delete-user-subscription',
	'mobile-purchases-feast-apple-pubsub',
	'mobile-purchases-feast-apple-update-subscriptions',
	'mobile-purchases-feast-google-pubsub',
	'mobile-purchases-feast-google-update-subscriptions',
	'mobile-purchases-google-oauth',
	'mobile-purchases-google-pubsub',
	'mobile-purchases-google-subscription-status',
	'mobile-purchases-google-update-subscriptions',
];

const teamToAppMappings: Record<Team, string[]> = {
	GROWTH: [
		'acquisition-events-api',
		'admin-console',
		'apps-metering',
		'apps-metering-exclusions-lambda',
		'batch-email-sender',
		'bigquery-acquisitions-publisher',
		'component-event-stream',
		'contributions-store-queue',
		'contributions-ticker-calculator',
		'dotcom-components',
		...sharedMobilePurchasesApps,
		'new-product-api',
		'price-migration-engine-state-machine',
		'promotions-tool',
		'sf-contact-merge',
		'sf-emails-to-s3-exporter',
		'sf-gocardless-sync',
		'super-mode-calculator',
		'support-reminders',
	],
	VALUE: [
		'apps-metering-events',
		'cancellation-sf-cases-api',
		'contact-us-api',
		'delivery-records-api',
		'delivery-problem-credit-processor',
		'discount-api',
		'holiday-stop-api',
		'holiday-stop-processor',
		'soft-opt-in-consent-setter',
		...sharedMobilePurchasesApps,
		'manage-help-content-publisher',
		'mobile-purchases-soft-opt-in-acquisitions',
		'mobile-purchases-soft-opt-in-acquisitions-dlq-processor',
		'payment-failure-comms',
		'publishing-alarm-stack-cdk',
		'salesforce-case-raiser',
		'product-switch-api',
		'update-supporter-plus-amount',
		'product-move-api',
	],
	SRE: ['alarms-handler', 'gchat-test-app'],
	PORTFOLIO: [
		// contributions-platform
		'fixation',

		// members-data-api
		'membership-attribute-service',

		// zuora-finance
		'zuora-creditor',

		// support-frontend
		'frontend',
		'it-test-runner',
		'stripe-intent',
		'workers',
		'payment-api',

		// support-service-lambdas
		'metric-push-api',
	],
	PLATFORM: [
		// fulfilment
		'failed-national-delivery-processor',
		'fulfilment-lambdas',
		'national-delivery-fulfilment',
		'fulfilment-date-calculator',

		// digital vouchers (subscription cards)
		'digital-voucher-api',
		'digital-voucher-suspension-processor',

		// salesforce
		'salesforce-disaster-recovery',
		'salesforce-disaster-recovery-health-check',
		'single-contribution-salesforce-writes',

		// zuora
		'invoicing-api',
		'zuora-oracle-fusion',

		// data retention
		'identity-retention',
		'zuora-retention', //https://github.com/guardian/zuora-retention
		'zuora-salesforce-link-remover',

		// finance
		'canonical-config',
	],
};

const buildAppToTeamMappings = (): Record<string, Team[]> => {
	const mappings: Record<string, Team[]> = {};

	for (const [team, apps] of Object.entries(teamToAppMappings)) {
		for (const app of apps) {
			const teams = mappings[app] ?? [];
			teams.push(team as Team);

			mappings[app] = teams;
		}
	}
	return mappings;
};

const appToTeamMappings: Record<string, Team[]> = buildAppToTeamMappings();

export const getTeams = (appName?: string): Team[] => {
	if (appName && appToTeamMappings[appName]) {
		return appToTeamMappings[appName];
	}

	return ['SRE'];
};

export const getTeamWebhookUrl = (team: Team): string => {
	return getIfDefined<string>(
		process.env[`${team}_WEBHOOK`],
		`${team}_WEBHOOK environment variable not set`,
	);
};
