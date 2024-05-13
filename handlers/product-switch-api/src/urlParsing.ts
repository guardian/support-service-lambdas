import { checkDefined } from '@modules/nullAndUndefined';
import type { ActionType } from './actionType';
import {
	ActionTypeValues,
	isActionType,
	ProductMoveActionType,
	UpdateSupporterPlusAmountActionType,
} from './actionType';

export type ProductSwitchParseResult = {
	actionType: typeof ProductMoveActionType;
	subscriptionNumber: string;
	switchType: string;
};
export type UpdateAmountParseResult = {
	actionType: typeof UpdateSupporterPlusAmountActionType;
	subscriptionNumber: string;
};
const validActionTypes = ActionTypeValues.join('|');
const actionTypeRegex = new RegExp(`^/(${validActionTypes})/.*$`);
const switchRegex = new RegExp(
	`/${ProductMoveActionType}/(recurring-contribution-to-supporter-plus)/(A-S\\d+)`,
);
const updateRegex = new RegExp(
	`^/${UpdateSupporterPlusAmountActionType}/(A-S\\d+)`,
);

export const getActionType = (urlPath: string): ActionType => {
	const match = urlPath.match(actionTypeRegex);

	if (isActionType(match?.[1])) {
		return match[1];
	}
	throw new ReferenceError(`Couldn't parse action type from url ${urlPath}`);
};
export const parseProductSwitch = (urlPath: string) => {
	const match = urlPath.match(switchRegex);
	const switchType = checkDefined(
		match?.[1],
		`Couldn't parse switch type and subscription number from url ${urlPath}`,
	);
	const subscriptionNumber = checkDefined(
		match?.[2],
		`Couldn't parse switch type and subscription number from url ${urlPath}`,
	);
	return { actionType: ProductMoveActionType, switchType, subscriptionNumber };
};

export const parseUpdateAmount = (urlPath: string) => {
	const match = urlPath.match(updateRegex);
	const subscriptionNumber = checkDefined(
		match?.[1],
		`Couldn't parse subscription number from url ${urlPath}`,
	);
	return {
		actionType: UpdateSupporterPlusAmountActionType,
		subscriptionNumber,
	};
};

export const parseUrl = (
	urlPath: string,
): ProductSwitchParseResult | UpdateAmountParseResult => {
	switch (getActionType(urlPath)) {
		case ProductMoveActionType:
			return parseProductSwitch(urlPath);
		case UpdateSupporterPlusAmountActionType:
			return parseUpdateAmount(urlPath);
	}
};
