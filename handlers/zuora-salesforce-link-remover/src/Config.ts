export const sfVersion = 'v58.0';

export function getSfAuth(): SfAuth {
	return {
		url: process.env.URL,
		client_id: process.env.CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
		grant_type: 'password',
		username: process.env.USERNAME,
		password: process.env.PASSWORD_AND_TOKEN,
	};
}

export type SfAuth = {
	url: string | undefined;
	client_id: string | undefined;
	client_secret: string | undefined;
	grant_type: string;
	username: string | undefined;
	password: string | undefined;
};
