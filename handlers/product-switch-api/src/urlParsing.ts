import { getIfDefined } from '@modules/nullAndUndefined';

const regex =
    /\/product-move\/(recurring-contribution-to-supporter-plus|change-billing-frequency-from-monthly-to-annual)\/(A-S\d+)/;
export const parseUrlPath = (urlPath: string) => {
	const match = urlPath.match(regex);
	const switchType = getIfDefined(
		match?.[1],
		`Couldn't parse switch type and subscription number from url ${urlPath}`,
	);
	const subscriptionNumber = getIfDefined(
		match?.[2],
		`Couldn't parse switch type and subscription number from url ${urlPath}`,
	);
	return { switchType, subscriptionNumber };
};
