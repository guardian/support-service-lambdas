export type SalesforceCredentials = {
	client_id: string;
	client_secret: string;
	sandbox: boolean;
};

export type StripeCredentials = {
	secret_key: string;
};

export type SalesforceAuthResponse = {
	access_token: string;
	instance_url: string;
	id: string;
	token_type: string;
	issued_at: string;
	signature: string;
};

export type SalesforceCreateError = {
	statusCode?: string;
	message: string;
	fields: string[];
};

export type SalesforceUpsertResponse = {
	id?: string;
	success: boolean;
	errors: SalesforceCreateError[];
};
