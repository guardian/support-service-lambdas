import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';

export const WebhookUrlsSchema = z.object({
	VALUE: z.string(),
	GROWTH: z.string(),
	SRE: z.string(),
	PORTFOLIO: z.string(),
	PLATFORM: z.string(),
});
export type WebhookUrls = z.infer<typeof WebhookUrlsSchema>;

export const AccountSchema = z.object({
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
export type ConfigSchema = z.infer<typeof ConfigSchema>;

export const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);
