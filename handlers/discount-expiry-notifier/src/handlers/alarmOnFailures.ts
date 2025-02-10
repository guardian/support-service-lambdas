/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
export const handler = async (event: {
	discountExpiresOnDate: string;
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
	}>;
	expiringDiscountProcessingAttempts: Array<{
		status: string;
	}>;
}) => {
	console.log('event', event);
	return {};
};
