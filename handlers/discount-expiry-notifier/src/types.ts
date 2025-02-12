export type BigQueryRecord = {
	firstName: string;
	nextPaymentDate: string;
	paymentAmount: number;
	paymentCurrency: string;
	paymentFrequency: string;
	productName: string;
	sfContactId: string;
	zuoraSubName: string;
	workEmail: string;
	contactCountry: string;
	sfBuyerContactMailingCountry: string;
	sfBuyerContactOtherCountry: string;
	sfRecipientContactMailingCountry: string;
	sfRecipientContactOtherCountry: string;
};

export type BaseRecordForEmailSend = BigQueryRecord & {
	subStatus: string;
};

export type EmailSendEligibility = {
	isEligible: boolean;
	ineligibilityReason: string;
};

export type EmailSendAttempt = {
	request: EmailSendRequest;
	response: {
		status: string;
		errorDetail: string;
	};
};

export type EmailSendRequest = {
	To: {
		Address: string;
		ContactAttributes: {
			SubscriberAttributes: {
				EmailAddress: string;
				payment_amount: string;
				first_name: string;
				next_payment_date: string;
				payment_frequency: string;
			};
		};
	};
	DataExtensionName: string;
	SfContactId: string;
};

export type DiscountProcessingAttempt = {
	record: BaseRecordForEmailSend;
	emailSendEligibility: EmailSendEligibility;
	emailSendAttempt: EmailSendAttempt;
};
