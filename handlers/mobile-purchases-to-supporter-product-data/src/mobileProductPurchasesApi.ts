import dayjs from 'dayjs';
import { z } from 'zod';

const subscriptionResponseSchema = z.object({
	subscriptions: z.array(
		z.object({
			subscriptionId: z.string(),
			productId: z.string(),
			to: z.string().transform((arg) => dayjs(arg)),
		}),
	),
});
export const fetchSubscriptionDetails = async (
	apiKey: string,
	identityId: string,
) => {
	const headers = new Headers({
		Authorization: `Bearer ${apiKey}`,
		'Content-Type': 'application/json',
	});

	const requestOptions: RequestInit = {
		method: 'GET',
		headers,
		redirect: 'follow',
	};

	return fetch(
		`https://mobile-purchases.mobile-aws.code.dev-guardianapis.com/user/subscriptions/${identityId}`,
		requestOptions,
	)
		.then((response) => response.json())
		.then((result) => console.log(result))
		.then((result) => subscriptionResponseSchema.parse(result));
};
