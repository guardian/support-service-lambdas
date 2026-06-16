import { accountObjectQuery } from '@modules/zuora/objectQuery/queries/accountObjectQuery';
import { ordersObjectQuery } from '@modules/zuora/objectQuery/queries/ordersObjectQuery';

/**
 * This provides a quick lookup for each query type that has been implemented from
 * https://developer.zuora.com/v1-api-reference/api/object-queries
 *
 * Due to the static types being carried through, you should be able to auto-complete
 * and type check all the fields as you call the functions.
 *
 * Example:
 * 	const userSubscriptions = await objectQuery.accounts.execute(
 * 		this.zuoraClient,
 * 		['id', 'name', 'accountNumber', 'balance'],  // each item type checked
 * 		['subscriptions.rateplans.rateplancharges'],                 // each item type checked
 * 		[{ field: 'IdentityId__c', operator: 'EQ', value: identityId }], // field and operator type checked
 * 		99,
 * 	);
 * 	// the return type lets us navigate safely down through all expanded levels
 * 	const chargeNumber = userSubscriptions.data[0]?.subscriptions[0]?.ratePlans[0]?.ratePlanCharges[0]?.chargeNumber;
 */
export const objectQuery = {
	accounts: accountObjectQuery,
	orders: ordersObjectQuery,
};
