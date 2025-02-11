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

export type RecordForEmailSend = BigQueryRecord & {
    subStatus: string;
};

export type DiscountProcessingAttempt = {
	detail: {
		item: BigQueryRecord & {
			subStatus: string;
			errorDetail: string;
		};
		emailSendAttempt: {
			status: string;
			payload: object;
			response: string;
		};
	};
};