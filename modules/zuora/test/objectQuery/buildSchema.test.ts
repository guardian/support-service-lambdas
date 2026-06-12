import {
	objectQueryResponseSchema,
	pickExpands,
} from '@modules/zuora/objectQuery/objectQueryBuilder';
import {
	accountExpandRegistry,
	accountObjectQuery,
} from '@modules/zuora/objectQuery/queries/accountObjectQuery';
import { z } from 'zod';
import largeAccountResponse from './largeAccountResponse.json';
import testData from './singleAccountWithLimit2.json';

test('expands deserialiser', () => {
	const schema = z.object(
		pickExpands(accountExpandRegistry, ['subscriptions.rateplans']),
	);
	const actual = schema.parse(testData);
	expect(actual.subscriptions[0]?.ratePlans[0]?.name).toEqual(
		'Monthly Contribution',
	);
});

test('single item deserialiser', () => {
	const schema = accountObjectQuery.buildItemSchema(
		['id', 'name', 'accountNumber', 'balance'],
		['subscriptions.rateplans', 'invoices'],
	);
	const actual = schema.parse(testData);
	expect(actual.accountNumber).toEqual('A01082554');
	// check the types flow correctly
	expect(actual.subscriptions[0]?.ratePlans[0]?.name).toEqual(
		'Monthly Contribution',
	);
});

test('multiple item deserialiser', () => {
	const testData = largeAccountResponse;
	const schema = objectQueryResponseSchema(
		accountObjectQuery.buildItemSchema(
			['id', 'name', 'accountNumber', 'balance'],
			['subscriptions.rateplans', 'invoices'],
		),
	);
	const actual = schema.parse(testData);
	const expected = 35;
	expect(actual.data).toHaveLength(expected);
	// make sure the types flow through completely for auto complete
	expect(actual.data[0]?.subscriptions[0]?.ratePlans[0]?.name).toEqual(
		'Monthly Contribution',
	);
	expect(actual.data[0]?.accountNumber).toEqual('A01082554');
});
