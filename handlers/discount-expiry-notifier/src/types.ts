export type ExpiringDiscountsToProcess = {
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

export type FilteredSubs = ExpiringDiscountsToProcess;

export type DiscountProcessingAttempt = {
	detail: {
		item: {
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
			subStatus: string;
			errorDetail: string;
		};
	};
	emailSendAttempt: EmailSendAttempt;
};

export type EmailSendAttempt = {
	status: string;
	payload: object;
	response: string;
};
