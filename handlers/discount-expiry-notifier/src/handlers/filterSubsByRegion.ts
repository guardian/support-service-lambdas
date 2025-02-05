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
	}>;
}) => {

	const region = getIfDefined<string>(
		process.env.REGION,
		'S3_BUCKET environment variable REGION not set',
	);

	console.log('event: ', event);
	console.log('region: ', region);

	return {
		region,
	};
};
