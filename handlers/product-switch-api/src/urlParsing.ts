import { checkDefined } from '@modules/nullAndUndefined';

const regex = /\/(recurring-contribution-to-supporter-plus)\/(A-S\d+)/;
export const parseUrlPath = (urlPath: string) => {
	const match = urlPath.match(regex);
	const switchType = checkDefined(
		match?.[1],
		`Couldn't parse switch type and subscription number from url ${urlPath}`,
	);
	const subscriptionNumber = checkDefined(
		match?.[2],
		`Couldn't parse switch type and subscription number from url ${urlPath}`,
	);
	return { switchType, subscriptionNumber };
};
