export type ExpiringDiscountToProcess = {
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

export type FilteredSub = ExpiringDiscountToProcess;

export type DiscountProcessingAttempt = {
    detail: {
        item: ExpiringDiscountToProcess & {
            subStatus: string;
            errorDetail: string;
        };
		emailSendAttempt: EmailSendAttempt;
    };
};

export type EmailSendAttempt = {
	status: string;
	payload: object;
	response: string;
};
