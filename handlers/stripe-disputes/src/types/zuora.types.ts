export type ZuoraCredentials = {
	clientId: string;
	clientSecret: string;
};

export type ZuoraGetPaymentQueryOutput = {
	id: string;
	Referenceid: string;
	paymentnumber: string;
	status: string;
	accountid: string;
};

export type ZuoraGetInvoiceQueryOutput = {
	invoicenumber: string;
	status: string;
};

export type ZuoraGetInvoicePaymentQueryOutput = {
	invoiceid: string;
};
