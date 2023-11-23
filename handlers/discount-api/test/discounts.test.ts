import { getDiscountsFromS3 } from '../src/discounts';

test('getDiscountsFromS3', async () => {
	const blah = await getDiscountsFromS3();
	console.log(blah);
	expect(blah).toEqual(5);
});
