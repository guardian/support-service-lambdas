export type SalesforceCredentials = {
	client_id: string;
	client_secret: string;
	username: string;
	password: string; // should include security token
	sandbox: boolean;
	token: string; // optional, if not included in password
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

export type SalesforceCreateResponse = {
	id?: string;
	success: boolean;
	errors: SalesforceCreateError[];
};
