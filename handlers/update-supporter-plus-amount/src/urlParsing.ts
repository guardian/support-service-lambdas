import { checkDefined } from '@modules/nullAndUndefined';

const regex = /\/product-move\/update-supporter-plus-amount\/(A-S\d+)/;
export const getSubscriptionNumberFromUrl = (urlPath: string) => {
	const match = urlPath.match(regex);
	return checkDefined(
		match?.[1],
		`Couldn't parse subscription number from url ${urlPath}`,
	);
};
