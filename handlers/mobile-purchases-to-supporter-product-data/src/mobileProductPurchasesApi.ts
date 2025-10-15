import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import dayjs from 'dayjs';
import { z } from 'zod';

const subscriptionResponseSchema = z.object({
	subscriptions: z.array(
		z.object({
			subscriptionId: z.string(),
			productId: z.string(),
			from: z.string().transform((arg) => dayjs(arg)),
			to: z.string().transform((arg) => dayjs(arg)),
		}),
	),
});

const domainNameForStage = (stage: Stage) =>
	stage === 'PROD'
		? 'mobile-purchases.mobile-aws.guardianapis.com'
		: 'mobile-purchases.mobile-aws.code.dev-guardianapis.com';

const fetchAllSubscriptionsForUser = async (
	stage: Stage,
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

	const url = `https://${domainNameForStage(stage)}/user/subscriptions/${identityId}`;

	return await fetch(url, requestOptions)
		.then((response) => response.json())
		.then((json) => subscriptionResponseSchema.parse(json));
};

export const fetchSubscription = async (
	stage: Stage,
	apiKey: string,
	identityId: string,
	subscriptionId: string,
) => {
	const data = await fetchAllSubscriptionsForUser(stage, apiKey, identityId);
	const subscription = data.subscriptions.find(
		(sub) => sub.subscriptionId === subscriptionId,
	);
	return getIfDefined(
		subscription,
		`Subscription with ID ${subscriptionId} not found for user ${identityId}`,
	);
};
