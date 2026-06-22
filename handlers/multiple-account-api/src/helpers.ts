export function buildComposedSubscriptionName(
	subscriptionName: string,
	secondaryIdentityId: string,
) {
	return `${subscriptionName}-${secondaryIdentityId}`;
}
