import {
	ProductMoveActionType,
	UpdateSupporterPlusAmountActionType,
} from '../src/actionType';
import {
	getActionType,
	parseProductSwitch,
	parseUpdateAmount,
	parseUrl,
} from '../src/urlParsing';

test('action type parsing', () => {
	const productMoveAction = getActionType(
		'/product-move/recurring-contribution-to-supporter-plus/A-S00504165',
	);
	expect(productMoveAction).toEqual('product-move');

	const updateAction = getActionType(
		'/update-supporter-plus-amount/A-S00504165',
	);
	expect(updateAction).toEqual('update-supporter-plus-amount');

	const invalidActionType =
		'/recurring-contribution-to-supporter-plus/A-S00504165';
	expect(() => {
		getActionType(invalidActionType);
	}).toThrow(
		"Couldn't parse action type from url /recurring-contribution-to-supporter-plus/A-S00504165",
	);
});
test('product-switch url parsing', () => {
	const successfulParsing = parseProductSwitch(
		'/product-move/recurring-contribution-to-supporter-plus/A-S00504165',
	);
	expect(successfulParsing.switchType).toEqual(
		'recurring-contribution-to-supporter-plus',
	);
	expect(successfulParsing.subscriptionNumber).toEqual('A-S00504165');

	const incorrectSwitchType =
		'/product-move/membership-to-digital-subscription/A-S00504165';
	expect(() => {
		parseProductSwitch(incorrectSwitchType);
	}).toThrow(
		"Couldn't parse switch type and subscription number from url /product-move/membership-to-digital-subscription/A-S00504165",
	);

	const invalidSubscriptionNumber =
		'/product-move/recurring-contribution-to-supporter-plus/A00000';
	expect(() => {
		parseProductSwitch(invalidSubscriptionNumber);
	}).toThrow(
		"Couldn't parse switch type and subscription number from url /product-move/recurring-contribution-to-supporter-plus/A00000",
	);

	const missingPathPrefix =
		'/recurring-contribution-to-supporter-plus/A-S00504165';
	expect(() => {
		parseProductSwitch(missingPathPrefix);
	}).toThrow(
		"Couldn't parse switch type and subscription number from url /recurring-contribution-to-supporter-plus/A-S00504165",
	);
});
test('amount update parsing', () => {
	const { subscriptionNumber } = parseUpdateAmount(
		'/update-supporter-plus-amount/A-S00504165',
	);
	expect(subscriptionNumber).toEqual('A-S00504165');
});

test('url parsing', () => {
	const parsedSwitch = parseUrl(
		'/product-move/recurring-contribution-to-supporter-plus/A-S00504165',
	);
	expect(parsedSwitch).toStrictEqual({
		actionType: ProductMoveActionType,
		switchType: 'recurring-contribution-to-supporter-plus',
		subscriptionNumber: 'A-S00504165',
	});

	const parsedUpdate = parseUrl('/update-supporter-plus-amount/A-S00504165');
	expect(parsedUpdate).toStrictEqual({
		subscriptionNumber: 'A-S00504165',
		actionType: UpdateSupporterPlusAmountActionType,
	});
});
