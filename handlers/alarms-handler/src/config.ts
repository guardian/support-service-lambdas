import { getSSMParam } from '@modules/aws/ssm';
import { getIfDefined } from '@modules/nullAndUndefined';

export const loadConfig = async (
	stage: string,
	stack: string,
	app: string,
): Promise<Config> => {
	const getConfig = async (...name: string[]): Promise<string> => {
		return await getSSMParam('/' + [stage, stack, app, ...name].join('/'));
	};

	const getAccount = async (accountName: string) => ({
		id: await getConfig('accounts', accountName, 'id'),
		roleArn: await getConfig('accounts', accountName, 'roleArn'),
	});

	const getTeamWebhookUrl = (team: string) =>
		getConfig(`teams`, team, 'webhookUrl');

	return {
		webhookUrls: {
			VALUE: await getTeamWebhookUrl('VALUE'),
			GROWTH: await getTeamWebhookUrl('GROWTH'),
			SRE: await getTeamWebhookUrl('SRE'),
			PORTFOLIO: await getTeamWebhookUrl('PORTFOLIO'),
			PLATFORM: await getTeamWebhookUrl('PLATFORM'),
		},
		accounts: {
			TARGETING: await getAccount('TARGETING'),
			MOBILE: await getAccount('MOBILE'),
		},
	};
};

type Account = {
	id: string;
	roleArn: string;
};
export type WebhookUrls = {
	VALUE: string;
	GROWTH: string;
	SRE: string;
	PORTFOLIO: string;
	PLATFORM: string;
};
export type Accounts = {
	TARGETING: Account;
	MOBILE: Account;
};
export type Config = {
	webhookUrls: WebhookUrls;
	accounts: Accounts;
};

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);
