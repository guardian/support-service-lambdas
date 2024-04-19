import { checkDefined } from '@modules/nullAndUndefined';

type Team = 'Value' | 'Growth' | 'P&P';

const appToTeamMappings: Record<string, Team> = {
    'apps-metering: ': 'Growth',
}

export const getTeam = (appName: string): Team | undefined => {
    return appToTeamMappings[appName];
}

export const buildWebhookMappings = (): Record<Team, string> => {
    const getEnvironmentVariable = (team: Team): string => checkDefined<string>(
        process.env[`${team}_WEBHOOK`],
        'WEBHOOK environment variable not set',
    );
    return {
        Value: getEnvironmentVariable('Value'),
        Growth: getEnvironmentVariable('Growth'),
        'P&P': getEnvironmentVariable('P&P'),
    }
}
