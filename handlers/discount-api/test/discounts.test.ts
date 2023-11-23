import { testFunction } from '../src/discounts';

test('getDiscountsFromS3', async () => {
	const blah = await testFunction();
	console.log(blah);
	expect(blah).toEqual(5);
});
