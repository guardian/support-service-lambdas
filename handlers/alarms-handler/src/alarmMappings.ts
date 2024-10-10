import { groupBy } from '@modules/arrayFunctions';
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
		'digital-voucher-api',
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
		'digital-voucher-suspension-processor',
		'metric-push-api',
	],
	PLATFORM: [
		// fulfilment
		'failed-national-delivery-processor',
		'fulfilment-lambdas',
		'national-delivery-fulfilment',
		'fulfilment-date-calculator',

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

export class AlarmMappings {
	constructor(mappings: Record<string, string[]> = teamToAppMappings) {
		this.appToTeamMappings = this.buildAppToTeamMappings(mappings);
	}

	private buildAppToTeamMappings = (
		theMappings: Record<Team, string[]>,
	): Record<string, Team[]> => {
		const entries: Array<[Team, string[]]> = Object.entries(
			theMappings,
		) as Array<[Team, string[]]>; // `as` - hmm?

		const teamToApp: Array<{ app: string; team: Team }> = entries.flatMap(
			([team, apps]) => apps.map((app) => ({ team, app })),
		);
		const groups = groupBy(teamToApp, ({ app }) => app);

		const mappings: Record<string, Team[]> = Object.fromEntries(
			Object.entries(groups).map(([app, info]) => [
				app,
				info.map(({ team }) => team),
			]),
		);

		return mappings;
	};

	private appToTeamMappings: Record<string, Team[]>;

	getTeams = (appName?: string): Team[] => {
		if (appName && this.appToTeamMappings[appName]) {
			return this.appToTeamMappings[appName] as Team[];
		}

		return ['SRE'];
	};

	getTeamWebhookUrl = (team: Team): string => {
		return getIfDefined<string>(
			process.env[`${team}_WEBHOOK`],
			`${team}_WEBHOOK environment variable not set`,
		);
	};
}
