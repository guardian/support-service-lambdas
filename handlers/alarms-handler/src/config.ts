import { getSSMParam } from '@modules/aws/ssm';
import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';

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

export const WebhookUrlsSchema = z.object({
	VALUE: z.string(),
	GROWTH: z.string(),
	SRE: z.string(),
	PORTFOLIO: z.string(),
	PLATFORM: z.string(),
});
export type WebhookUrls = z.infer<typeof WebhookUrlsSchema>;

export const AccountSchema = z.object({
	id: z.string(),
	roleArn: z.string(),
});
export type Account = z.infer<typeof AccountSchema>;

export const AccountsSchema = z.object({
	TARGETING: AccountSchema,
	MOBILE: AccountSchema,
});
export type Accounts = z.infer<typeof AccountsSchema>;

export const ConfigSchema = z.object({
	webhookUrls: WebhookUrlsSchema,
	accounts: AccountsSchema,
});
export type Config = z.infer<typeof ConfigSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);
