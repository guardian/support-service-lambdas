export const ProductMoveActionType = 'product-move' as const;
export const UpdateSupporterPlusAmountActionType =
	'update-supporter-plus-amount' as const;
export const ActionTypeValues = [
	ProductMoveActionType,
	UpdateSupporterPlusAmountActionType,
] as const;
export type ActionType = (typeof ActionTypeValues)[number];
export const isActionType = (actionType: unknown): actionType is ActionType => {
	return (ActionTypeValues as readonly unknown[]).includes(actionType);
};
