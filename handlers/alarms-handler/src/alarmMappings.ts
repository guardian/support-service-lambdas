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
	],
	VALUE: ['holiday-stop-api', 'soft-opt-in-consent-setter'],
	SRE: ['gchat-test-app'],
	PP: [],
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

export const getTeam = (appName: string): Team => {
	const team = appToTeamMappings[appName];
	if (!team) {
		console.log(`No team found for app: ${appName}, defaulting to SRE`);
		return 'SRE';
	}
	return team;
};

export const buildWebhookMappings = (): Record<Team, string> => {
	const getEnvironmentVariable = (team: Team): string => {
		const prefix = team.toUpperCase();
		return checkDefined<string>(
			process.env[`${prefix}_WEBHOOK`],
			`${prefix}_WEBHOOK environment variable not set`,
		);
	};
	return {
		VALUE: getEnvironmentVariable('VALUE'),
		GROWTH: getEnvironmentVariable('GROWTH'),
		PP: getEnvironmentVariable('PP'),
		SRE: getEnvironmentVariable('SRE'),
	};
};
