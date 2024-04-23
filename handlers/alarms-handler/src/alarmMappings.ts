import { checkDefined } from '@modules/nullAndUndefined';

type Team = 'Value' | 'Growth' | 'PP' | 'SRE';

const appToTeamMappings: Record<string, Team> = {
    'apps-metering: ': 'Growth',
    'gchat-test-app': 'SRE',
}

export const getTeam = (appName: string): Team => {
    const team = appToTeamMappings[appName];
    if (!team) {
        console.log(`No team found for app: ${appName}, defaulting to SRE`);
        return 'SRE';
    }
    return team;
}

export const buildWebhookMappings = (): Record<Team, string> => {
    const getEnvironmentVariable = (team: Team): string => {
        const prefix = team.toUpperCase();
        return checkDefined<string>(
            process.env[`${prefix}_WEBHOOK`],
            `${prefix}_WEBHOOK environment variable not set`,
        );
    }
    return {
        Value: getEnvironmentVariable('Value'),
        Growth: getEnvironmentVariable('Growth'),
        PP: getEnvironmentVariable('PP'),
        SRE: getEnvironmentVariable('SRE'),
    }
}
