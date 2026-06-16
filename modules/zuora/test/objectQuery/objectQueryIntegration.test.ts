/**
 * @group integration
 */
import { objectQuery } from '@modules/zuora/objectQuery';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

const eventualZuoraClient = ZuoraClient.create('CODE');

test('accounts with invoices and charges', async () => {
	const identityId = '200372455';
	const userSubscriptions = await objectQuery.accounts.execute(
		await eventualZuoraClient,
		['id', 'balance', 'accountNumber'],
		['invoices', 'subscriptions.rateplans.rateplancharges'],
		[{ field: 'IdentityId__c', operator: 'EQ', value: identityId }],
		2,
	);
	expect(userSubscriptions.data[0]?.balance).toEqual(18);
	expect(userSubscriptions.data[0]?.invoices[0]?.amount).toEqual(18);
	expect(
		userSubscriptions.data[0]?.subscriptions[0]?.ratePlans[0]
			?.ratePlanCharges[0]?.name,
	).toEqual('Upsell - Supporter Plus to Digital Plus Switch tbc off');
});

test('orders with actions', async () => {
	const orders = await objectQuery.orders.execute(
		await eventualZuoraClient,
		['id', 'orderDate'],
		['orderActions'],
		[
			{
				field: 'accountid',
				operator: 'EQ',
				value: '8ad08e1a8842f0b701884371acad3f6b',
			},
		],
		99,
	);
	expect(orders.data[0]?.id).toEqual('8ad080a79e45f84d019e4e0e814271f3');
	expect(orders.data[0]?.orderActions[0]?.changeReason).toBeNull();
});
