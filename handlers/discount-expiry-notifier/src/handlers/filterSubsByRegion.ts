import { getIfDefined } from '@modules/nullAndUndefined';

export const handler = (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcess: Array<{
		firstName: string;
		nextPaymentDate: string;
		paymentAmount: number;
		paymentCurrency: string;
		paymentFrequency: string;
		productName: string;
		sfContactId: string;
		subName: string;
		workEmail: string;
		contactCountry: string;
		sfBuyerContactMailingCountry: string;
		sfBuyerContactOtherCountry: string;
		sfRecipientContactMailingCountry: string;
		sfRecipientContactOtherCountry: string;
	}>;
}) => {
	try{
		const region = getIfDefined<string>(
			process.env.REGION,
			'S3_BUCKET environment variable REGION not set',
		);

		console.log('event: ', event);
		console.log('region: ', region);

		const subsFilteredByRegion = event.expiringDiscountsToProcess.filter(
			(sub) =>
				sub.contactCountry === region ||
				sub.sfBuyerContactMailingCountry === region ||
				sub.sfBuyerContactOtherCountry === region ||
				sub.sfRecipientContactMailingCountry === region ||
				sub.sfRecipientContactOtherCountry === region,
		);
		console.log('subsFilteredByRegion: ', subsFilteredByRegion);

		const returnValue = {
			...event,
			subsFilteredByRegion,
		};
		console.log('returnValue: ', returnValue);

		return returnValue;
	} catch (error) {
		console.error('Error:', error);
		throw error;  // Ensure errors propagate correctly
	}
};
