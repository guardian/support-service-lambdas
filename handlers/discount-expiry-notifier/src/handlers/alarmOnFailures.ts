/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
export const handler = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcessCount: number;
	expiringDiscountsToProcess: Array<{
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
	}>;
	filteredSubsCount: number;
	filteredSubs: Array<{
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
	}>;
	discountProcessingAttempts: Array<{
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
		emailSendAttempt: {
			status: string;
			payload: object;
			response: string;
		};
	}>;
}) => {
	console.log('event', event);

	if (await errorsOccurred(event)) {
		console.log('errorsOccurred: TRUE');
		throw new Error('Errors occurred. Check logs.');
	} else {
		console.log('errorsOccurred: FALSE');
	}
	return {};
};

export const errorsOccurred = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcessCount: number;
	expiringDiscountsToProcess: Array<{
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
	}>;
	filteredSubsCount: number;
	filteredSubs: Array<{
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
	}>;
	discountProcessingAttempts: Array<{
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
		emailSendAttempt: {
			status: string;
			payload: object;
			response: string;
		};
	}>;
	uploadAttemptStatus: string;
}): Promise<boolean> => {
	return event.discountProcessingAttempts.some(
		(attempt) =>
			attempt.emailSendAttempt.status === 'error' ||
			event.uploadAttemptStatus === 'error',
	);
};
