import { getIfDefined } from '@modules/nullAndUndefined';

const regex = /\/update-supporter-plus-amount\/(A-S\d+)/;
export const getSubscriptionNumberFromUrl = (urlPath: string) => {
	const match = urlPath.match(regex);
	return getIfDefined(
		match?.[1],
		`Couldn't parse subscription number from url ${urlPath}`,
	);
};
