import { checkDefined } from '@modules/nullAndUndefined';

type Team = 'VALUE' | 'GROWTH' | 'PP' | 'SRE';

const sharedMobilePurchasesApps = [
	'mobile-purchases-google-oauth',
	'mobile-purchases-google-subscription-status',
	'mobile-purchases-apple-subscription-status',
	'mobile-purchases-apple-pubsub',
	'mobile-purchases-feast-apple-pubsub',
	'mobile-purchases-google-pubsub',
	'mobile-purchases-feast-google-pubsub',
	'mobile-purchases-apple-pubsub',
	'mobile-purchases-google-pubsub',
	'mobile-purchases-feast-apple-pubsub',
	'mobile-purchases-delete-user-subscription',
];

const teamToAppMappings: Record<Team, string[]> = {
	GROWTH: [
		'acquisition-events-api',
		'admin-console',
		'apps-metering',
		'batch-email-sender',
		'component-event-stream',
		'contributions-ticker-calculator',
		'digital-voucher-api',
		'dotcom-components',
		'fulfilment-date-calculator',
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
		'holiday-stop-api',
		'holiday-stop-processor',
		'soft-opt-in-consent-setter',
		...sharedMobilePurchasesApps,
		'mobile-purchases-soft-opt-in-acquisitions',
		'mobile-purchases-soft-opt-in-acquisitions-dlq-processor',
	],
	SRE: ['gchat-test-app'],
	PP: [
		'canonical-config',
		'frontend',
		'it-test-runner',
		'stripe-intent',
		'salesforce-disaster-recovery',
		'salesforce-disaster-recovery-health-check',
		'workers',
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
}

const appToTeamMappings: Record<string, Team[]> = buildAppToTeamMappings();

export const getTeams = (appName?: string): Team[] => {
	if (appName && appToTeamMappings[appName]) {
		return appToTeamMappings[appName] as Team[];
	}

	return ['SRE'];
};

export const getTeamWebhookUrl = (team: Team): string => {
	return checkDefined<string>(
		process.env[`${team}_WEBHOOK`],
		`${team}_WEBHOOK environment variable not set`,
	);
};
