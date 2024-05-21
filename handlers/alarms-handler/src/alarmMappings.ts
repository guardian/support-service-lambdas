import { checkDefined } from '@modules/nullAndUndefined';

type Team = 'VALUE' | 'GROWTH' | 'PP' | 'SRE';

const teamToAppMappings: Record<Team, string[]> = {
	GROWTH: [
		'apps-metering',
		'dotcom-components',
		'admin-console',
		'promotions-tool',
		'price-migration-engine-state-machine',
		'support-reminders',
		'contributions-ticker-calculator',
		'acquisition-events-api',
		'batch-email-sender',
		'digital-voucher-api',
		'fulfilment-date-calculator',
		'new-product-api',
		'sf-contact-merge',
		'sf-emails-to-s3-exporter',
		'sf-gocardless-sync',
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
	],
	VALUE: [
		'cancellation-sf-cases-api',
		'contact-us-api',
		'delivery-records-api',
		'delivery-problem-credit-processor',
		'holiday-stop-api',
		'holiday-stop-processor',
		'soft-opt-in-consent-setter',
		'mobile-purchases-soft-opt-in-acquisitions',
		'mobile-purchases-soft-opt-in-acquisitions-dlq-processor',
	],
	SRE: ['gchat-test-app'],
	PP: [
		'frontend',
		'salesforce-disaster-recovery',
		'salesforce-disaster-recovery-health-check',
	],
};

const appToTeamMappings: Record<string, Team> = Object.entries(
	teamToAppMappings,
).reduce(
	(mappings, [team, apps]) => ({
		...mappings,
		...apps.reduce((acc, app) => ({ ...acc, [app]: team }), {}),
	}),
	{},
);

export const getTeam = (appName?: string): Team => {
	if (appName && appToTeamMappings[appName]) {
		return appToTeamMappings[appName] as Team;
	}

	return 'SRE';
};

export const getTeamWebhookUrl = (team: Team): string => {
	return checkDefined<string>(
		process.env[`${team}_WEBHOOK`],
		`${team}_WEBHOOK environment variable not set`,
	);
};
